from __future__ import annotations
import argparse, json
from collections import defaultdict, Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from .archive_seo import slugify, _write_json, issue_title, issue_description
from .config import CONTENT_ROOT

def _now_iso(): return datetime.now(timezone.utc).replace(microsecond=0).isoformat()
def _read_json(path: Path):
    try: return json.loads(path.read_text(encoding='utf-8'))
    except Exception: return None
def _num(v):
    try: return float(v or 0)
    except Exception: return 0.0
def _int(v):
    try: return int(v or 0)
    except Exception: return 0
def _week_id(d):
    y,w,_=datetime.fromisoformat(d).isocalendar(); return f'{y}-W{w:02d}'
def _summary_fields(s):
    s=s or {}; return {'buckets':_int(s.get('buckets')),'matched_buckets':_int(s.get('matched_buckets')),'pending_buckets':_int(s.get('pending_buckets')),'trade_qty':_int(s.get('trade_qty')),'trade_amt_rs':round(_num(s.get('trade_amt_rs')),2),'buy_aggr_qty':_int(s.get('buy_aggr_qty')),'sell_aggr_qty':_int(s.get('sell_aggr_qty')),'ambig_qty':_int(s.get('ambig_qty')),'net_aggr_qty':_int(s.get('net_aggr_qty')),'buy_aggr_amt_rs':round(_num(s.get('buy_aggr_amt_rs')),2),'sell_aggr_amt_rs':round(_num(s.get('sell_aggr_amt_rs')),2),'ambig_amt_rs':round(_num(s.get('ambig_amt_rs')),2),'net_aggr_amt_rs':round(_num(s.get('net_aggr_amt_rs')),2),'confidence_pct':round(_num(s.get('confidence_pct')),2),'explainability_pct':round(_num(s.get('explainability_pct')),2),'gap_count':_int(s.get('gap_count')),'wipe_count':_int(s.get('wipe_count')),'upper_lock_count':_int(s.get('upper_lock_count')),'lower_lock_count':_int(s.get('lower_lock_count')),'bias':s.get('bias') or 'mixed','evidence_label':s.get('evidence_label') or 'Medium Evidence'}
def _combine(entries):
    if not entries: return _summary_fields({})
    total=defaultdict(float); conf=[]; expl=[]
    for e in entries:
        s=e.get('summary') or e
        for k in ['buckets','matched_buckets','pending_buckets','trade_qty','trade_amt_rs','buy_aggr_qty','sell_aggr_qty','ambig_qty','net_aggr_qty','buy_aggr_amt_rs','sell_aggr_amt_rs','ambig_amt_rs','net_aggr_amt_rs','gap_count','wipe_count','upper_lock_count','lower_lock_count']: total[k]+=_num(s.get(k))
        if s.get('confidence_pct') is not None: conf.append(_num(s.get('confidence_pct')))
        if s.get('explainability_pct') is not None: expl.append(_num(s.get('explainability_pct')))
    c=sum(conf)/len(conf) if conf else 0; x=sum(expl)/len(expl) if expl else 0; ev='High Evidence' if c>=85 and x>=85 and total['gap_count']==0 else 'Medium Evidence' if c>=70 and x>=70 else 'Lower Evidence'
    out={k:int(total[k]) for k in ['buckets','matched_buckets','pending_buckets','trade_qty','buy_aggr_qty','sell_aggr_qty','ambig_qty','net_aggr_qty','gap_count','wipe_count','upper_lock_count','lower_lock_count']}
    out.update({k:round(total[k],2) for k in ['trade_amt_rs','buy_aggr_amt_rs','sell_aggr_amt_rs','ambig_amt_rs','net_aggr_amt_rs']}); out.update({'confidence_pct':round(c,2),'explainability_pct':round(x,2),'bias':'buy' if out['net_aggr_qty']>0 else 'sell' if out['net_aggr_qty']<0 else 'mixed','evidence_label':ev}); return out
def _daily_entry(issue):
    m=issue.get('market_summary') or {}; f=issue.get('featured_stock') or {}; secs=issue.get('sectors') or []; top=secs[0] if secs else {}; pub=issue.get('publishing') or {}; y=(issue.get('youtube_package') or {}).get('youtube_url') or pub.get('youtube_url') or ''; d=issue.get('business_date')
    return {'type':'daily','business_date':d,'title':issue_title(issue),'summary':issue_description(issue),'url':f'/daily/{d}','published':bool(pub.get('published') or pub.get('status')=='published'),'status':pub.get('status','draft'),'market_bias':m.get('bias'),'evidence_label':m.get('evidence_label'),**_summary_fields(m),'top_sector':top.get('sector_name'),'featured_symbol':f.get('symbol'),'featured_company':f.get('company_name'),'featured_sector':f.get('sector_name'),'video_status':'published' if y else 'coming_soon','youtube_url':y,'canonical_url':f'/daily/{d}','source_json':f'/content/daily/{d}.json'}
def _stock_entry(issue, stock, featured):
    d=issue.get('business_date'); y=(issue.get('publishing') or {}).get('youtube_url') or (issue.get('youtube_package') or {}).get('youtube_url') or ''
    return {'business_date':d,'symbol':stock.get('symbol'),'company_name':stock.get('company_name') or stock.get('security_name'),'sector_name':stock.get('sector_name'),'daily_url':f"/daily/{d}?sector={stock.get('sector_name','')}&symbol={stock.get('symbol','')}",'stock_url':f"/stocks/{stock.get('symbol')}",'featured':bool(featured),'video_url':y if featured else '',**_summary_fields(stock.get('summary'))}
def _sector_entry(issue, sec):
    d=issue.get('business_date'); name=sec.get('sector_name'); f=issue.get('featured_stock') or {}
    return {'business_date':d,'sector_name':name,'sector_slug':slugify(name),'daily_url':f'/daily/{d}?sector={name}','sector_url':f'/sectors/{slugify(name)}','active_stocks':_int(sec.get('active_stocks')),'featured_symbol':f.get('symbol') if f.get('sector_name')==name else '','index':sec.get('index'),**_summary_fields(sec.get('summary'))}
def _glossary():
    pairs=[('Bucket','A reconstructed event around volume increase and PRE/POST depth context.'),('PRE frame','The visible WS book frame immediately before a volume-up bucket.'),('POST frame','The after-trade WS frame observed when volume increases.'),('Buy aggressor','Aggressive flow consuming visible ask-side liquidity.'),('Sell aggressor','Aggressive flow consuming visible bid-side liquidity.'),('Agg Qty','Quantity attributed to buy, sell, or ambiguous aggressor flow.'),('Agg Amt, proxy','Bucket turnover proxy-allocated by aggressor quantity share.'),('Net Agg Qty','Buy aggressor quantity minus sell aggressor quantity.'),('Net Agg Amt','Buy aggressor amount minus sell aggressor amount.'),('Confidence','Reliability of aggressor-side classification.'),('Explainability','How much of the bucket is explainable by visible data and rules.'),('Gap','WS timing gap data-quality warning.'),('Wipe','Visible level exhaustion in PRE/POST transition.'),('Lock','Book state warning such as upper/lower locked condition.'),('Sector source','nepse_index_meta.json membership, optional company-meta fallback, then Unmapped.'),('Content index','Generated JSON registry for daily, weekly, stock, sector, video, article, glossary, search, and sitemap entries.')]
    return [{'term':t,'slug':slugify(t),'url':f'/learn#{slugify(t)}','summary':s,'keywords':[t.lower(),slugify(t)]} for t,s in pairs]
def _weekly(issues):
    groups=defaultdict(list)
    for i in issues:
        if i.get('business_date'): groups[_week_id(i['business_date'])].append(i)
    widx=[]; pages={}
    for wid, rows in sorted(groups.items(), reverse=True):
        rows=sorted(rows, key=lambda x:x.get('business_date','')); summ=_combine([{'summary':r.get('market_summary') or {}} for r in rows]); bysec=defaultdict(list); scount=Counter(); fcount=Counter()
        for r in rows:
            f=r.get('featured_stock') or {}; 
            if f.get('symbol'): fcount[f.get('symbol')]+=1
            for sec in r.get('sectors') or []:
                bysec[sec.get('sector_name') or 'Unmapped'].append({'summary':sec.get('summary') or {},'business_date':r.get('business_date')})
                for st in sec.get('stocks') or []:
                    if st.get('symbol'): scount[st.get('symbol')]+=1
        sector_summary=[]
        for name, ents in bysec.items(): sector_summary.append({'sector_name':name,'sector_slug':slugify(name),'days_active':len({e.get('business_date') for e in ents}),'summary':_combine(ents)})
        sector_summary.sort(key=lambda x:x['summary'].get('trade_amt_rs',0), reverse=True); start=rows[0].get('business_date'); end=rows[-1].get('business_date'); top=sector_summary[0]['sector_name'] if sector_summary else ''; topf=fcount.most_common(1)[0][0] if fcount else (rows[-1].get('featured_stock') or {}).get('symbol')
        page={'type':'weekly','week_id':wid,'start_date':start,'end_date':end,'url':f'/weekly/{wid}','title':f'NEPSE Weekly Order-Flow Summary — {wid}','published':any((r.get('publishing') or {}).get('published') for r in rows),'trading_days':len(rows),'summary':summ,'top_sector':top,'top_featured_stock':topf,'daily_entries':[_daily_entry(r) for r in rows],'sector_summary':sector_summary,'repeated_stocks':[{'symbol':s,'appearances':c} for s,c in scount.most_common(25)],'videos':[],'article':{'status':'draft','title':f'NEPSE Weekly Order-Flow Summary — {wid}','opening':'Weekly article is approved from the admin writer before public publishing.'}}
        pages[wid]=page; widx.append({'week_id':wid,'start_date':start,'end_date':end,'url':f'/weekly/{wid}','published':page['published'],'trading_days':len(rows),'top_sector':top,'top_featured_stock':topf,**summ,'daily_urls':[f"/daily/{r.get('business_date')}" for r in rows]})
    return widx,pages
def build_content_indexes(content_root: str|Path=CONTENT_ROOT):
    root=Path(content_root); issues=[]
    for p in sorted((root/'daily').glob('*.json')):
        i=_read_json(p)
        if i and i.get('business_date'): issues.append(i)
    issues.sort(key=lambda x:x.get('business_date',''), reverse=True); daily=[_daily_entry(i) for i in issues]; stocks={}; sectors={}; videos=[]; articles=[]
    for issue in issues:
        d=issue.get('business_date'); f=issue.get('featured_stock') or {}; fs=f.get('symbol'); articles.append({'id':f'daily-{d}','type':'daily','business_date':d,'title':issue_title(issue),'url':f'/daily/{d}','published':bool((issue.get('publishing') or {}).get('published')),'approved':bool((issue.get('publishing') or {}).get('article_approved')),'featured_symbol':fs,'sector':f.get('sector_name'),'summary':issue_description(issue)})
        for sec in issue.get('sectors') or []:
            se=_sector_entry(issue,sec); node=sectors.setdefault(se['sector_slug'],{'sector':se['sector_name'],'sector_slug':se['sector_slug'],'url':f"/sectors/{se['sector_slug']}",'entries':[]}); node['entries'].append(se)
            for st in sec.get('stocks') or []:
                sym=st.get('symbol')
                if not sym: continue
                e=_stock_entry(issue,st,sym==fs); sn=stocks.setdefault(sym,{'symbol':sym,'company_name':e.get('company_name'),'sector_name':e.get('sector_name'),'url':f'/stocks/{sym}','entries':[]}); sn['entries'].append(e)
        pub=issue.get('publishing') or {}; yt=issue.get('youtube_package') or {}; y=pub.get('youtube_url') or yt.get('youtube_url') or ''
        if y or pub.get('status') in {'video_uploaded','published'}: videos.append({'business_date':d,'symbol':fs,'sector':f.get('sector_name'),'title':(yt.get('title_options') or [issue_title(issue)])[0],'daily_url':f'/daily/{d}','stock_url':f'/stocks/{fs}' if fs else '/stocks','youtube_url':y,'status':pub.get('status','draft'),'published':bool(pub.get('published') or pub.get('status')=='published'),'published_at':pub.get('published_at') or ''})
    for n in stocks.values(): n['entries'].sort(key=lambda e:e.get('business_date',''), reverse=True); n['latest_entry']=n['entries'][0] if n['entries'] else None; n['entry_count']=len(n['entries'])
    for n in sectors.values(): n['entries'].sort(key=lambda e:e.get('business_date',''), reverse=True); n['latest_entry']=n['entries'][0] if n['entries'] else None; n['entry_count']=len(n['entries'])
    weekly_index, weekly_pages=_weekly(issues)
    for wid,page in weekly_pages.items(): _write_json(root/'weekly'/f'{wid}.json',page); articles.append({'id':f'weekly-{wid}','type':'weekly','week_id':wid,'title':page['title'],'url':page['url'],'published':page['published'],'summary':f"Weekly summary from {page['start_date']} to {page['end_date']}"})
    glossary=_glossary(); search=[]
    for d in daily: search.append({'id':f"daily-{d['business_date']}",'type':'daily','title':d['title'],'url':d['url'],'date':d['business_date'],'keywords':[d['business_date'],d.get('featured_symbol'),d.get('featured_sector'),d.get('top_sector'),d.get('market_bias'),'NEPSE daily summary','order flow']})
    for w in weekly_index: search.append({'id':f"weekly-{w['week_id']}",'type':'weekly','title':f"NEPSE Weekly Order-Flow Summary — {w['week_id']}",'url':w['url'],'date':w['end_date'],'keywords':[w['week_id'],w['start_date'],w['end_date'],w.get('top_sector'),w.get('top_featured_stock'),'NEPSE weekly summary']})
    for sym,n in sorted(stocks.items()): search.append({'id':f'stock-{sym}','type':'stock','title':f'{sym} Historical Order-Flow Archive','url':n['url'],'keywords':[sym,n.get('company_name'),n.get('sector_name'),'stock archive']})
    for sl,n in sorted(sectors.items()): search.append({'id':f'sector-{sl}','type':'sector','title':f"{n['sector']} Sector Archive",'url':n['url'],'keywords':[n['sector'],'sector archive','order flow']})
    for g in glossary: search.append({'id':f"glossary-{g['slug']}",'type':'glossary','title':g['term'],'url':g['url'],'keywords':g['keywords']})
    sm=[]
    for d in daily: sm.append({'loc':d['url'],'lastmod':d['business_date'],'type':'daily'})
    for w in weekly_index: sm.append({'loc':w['url'],'lastmod':w['end_date'],'type':'weekly'})
    for sym,n in stocks.items(): sm.append({'loc':n['url'],'lastmod':n['latest_entry']['business_date'] if n.get('latest_entry') else None,'type':'stock'})
    for sl,n in sectors.items(): sm.append({'loc':n['url'],'lastmod':n['latest_entry']['business_date'] if n.get('latest_entry') else None,'type':'sector'})
    sm += [{'loc':'/','lastmod':daily[0]['business_date'] if daily else None,'type':'home'},{'loc':'/daily','lastmod':daily[0]['business_date'] if daily else None,'type':'daily_archive'},{'loc':'/weekly','lastmod':daily[0]['business_date'] if daily else None,'type':'weekly_archive'},{'loc':'/stocks','lastmod':daily[0]['business_date'] if daily else None,'type':'stock_archive'},{'loc':'/sectors','lastmod':daily[0]['business_date'] if daily else None,'type':'sector_archive'},{'loc':'/videos','lastmod':daily[0]['business_date'] if daily else None,'type':'video_archive'},{'loc':'/learn','lastmod':daily[0]['business_date'] if daily else None,'type':'glossary'}]
    gen=_now_iso(); payloads={'daily.index.json':{'generated_at':gen,'items':daily,'count':len(daily)},'weekly.index.json':{'generated_at':gen,'items':weekly_index,'count':len(weekly_index)},'stocks.index.json':{'generated_at':gen,'items':stocks,'count':len(stocks)},'sectors.index.json':{'generated_at':gen,'items':sectors,'count':len(sectors)},'videos.index.json':{'generated_at':gen,'items':videos,'count':len(videos)},'articles.index.json':{'generated_at':gen,'items':articles,'count':len(articles)},'glossary.index.json':{'generated_at':gen,'items':glossary,'count':len(glossary)}}
    for name,pay in payloads.items(): _write_json(root/'indexes'/name,pay)
    _write_json(root/'search.index.json',{'generated_at':gen,'items':search,'count':len(search)}); _write_json(root/'sitemap.json',{'generated_at':gen,'urls':sm,'count':len(sm)})
    _write_json(root/'archive'/'daily.json',{'generated_at':gen,'items':daily,'count':len(daily),'source':'indexes/daily.index.json'}); _write_json(root/'archive'/'stocks.json',{'generated_at':gen,'items':[e for n in stocks.values() for e in n['entries']],'count':sum(len(n['entries']) for n in stocks.values()),'source':'indexes/stocks.index.json'}); _write_json(root/'archive'/'sectors.json',{'generated_at':gen,'items':[e for n in sectors.values() for e in n['entries']],'count':sum(len(n['entries']) for n in sectors.values()),'source':'indexes/sectors.index.json'}); _write_json(root/'archive'/'videos.json',{'generated_at':gen,'items':videos,'count':len(videos),'source':'indexes/videos.index.json'})
    return {'generated_at':gen,'counts':{k:v.get('count') for k,v in payloads.items()},'sitemap_urls':len(sm),'search_records':len(search)}
def main():
    p=argparse.ArgumentParser(); p.add_argument('--content-root',default=str(CONTENT_ROOT)); a=p.parse_args(); print(json.dumps(build_content_indexes(a.content_root),indent=2))
if __name__=='__main__': main()
