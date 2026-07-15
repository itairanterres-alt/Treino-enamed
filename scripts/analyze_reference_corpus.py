#!/usr/bin/env python3
from __future__ import annotations
import argparse,json,re,statistics
from collections import Counter
from pathlib import Path

def words(text:str)->int:return len(re.findall(r"\b[\wÀ-ÿ]+\b",text,re.UNICODE))
def summary(values:list[int])->dict:
    return {'min':min(values),'median':statistics.median(values),'mean':round(statistics.mean(values),1),'max':max(values)}
def main():
    p=argparse.ArgumentParser();p.add_argument('corpus',type=Path);p.add_argument('key_catalog',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
    corpus=json.loads(a.corpus.read_text());catalog=json.loads(a.key_catalog.read_text());keys={int(i['external_id'][-3:]):i['metadata'] for i in catalog['items']}
    valid=[];status=Counter()
    for q in corpus['questions']:
        meta=keys[q['number']];status[meta['official_key_status']]+=1
        if meta['official_key_status']=='valid':valid.append(q)
    terms={'diagnosis':r'diagn[oó]stic','conduct':r'conduta','treatment':r'tratamento','management':r'manejo','test_or_exam':r'\bexame|exames\b','medication':r'f[aá]rmaco|medicamento','primary_care':r'atenção primária|\bUBS\b|saúde da família','emergency':r'emergência|urgência|\bUPA\b','sus':r'\bSUS\b'}
    term_counts={name:sum(bool(re.search(pattern,q['stem'],re.I)) for q in valid) for name,pattern in terms.items()}
    result={'source':'ENAMED 2025 — Caderno 01','questions_total':len(corpus['questions']),'official_statuses':dict(sorted(status.items())),'valid_reference_items':len(valid),'stem_words':summary([words(q['stem']) for q in valid]),'total_words':summary([words(q['raw_text']) for q in valid]),'alternative_words':summary([words(text) for q in valid for text in q['alternatives'].values()]),'term_presence':term_counts,'pages':{'first':min(q['page'] for q in valid),'last':max(q['page'] for q in valid)},'structural_failures':[q['number'] for q in corpus['questions'] if not q['structurally_complete']]}
    a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
if __name__=='__main__':main()
