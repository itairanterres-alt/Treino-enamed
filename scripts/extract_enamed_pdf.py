#!/usr/bin/env python3
"""Extrai questões de um caderno ENAMED preservando a ordem das duas colunas."""
from __future__ import annotations
import argparse, hashlib, json, re
from pathlib import Path
import pdfplumber

MARKER = re.compile(r"\bQUEST[AÃ]O\s+(\d{1,3})(?:\s+(ANULADA))?", re.IGNORECASE)
ALT = re.compile(r"(?:^|\n)\s*\(([A-D])\)\s+", re.MULTILINE)

def clean(text: str) -> str:
    text = text.replace("\u00ad", "").replace("\r", "")
    text = re.sub(r"(?m)^\s*(?:ÁREA LIVRE|enamed)\s*$", "", text, flags=re.IGNORECASE)
    text = re.sub(r"(?m)^\s*\d{1,2}\s*$", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

def structure(body: str) -> tuple[str,dict[str,str]]:
    matches=list(ALT.finditer('\n'+body))
    if not matches: return body,{}
    offset=1;stem=body[:max(0,matches[0].start()-offset)].strip();alternatives={}
    for index,match in enumerate(matches):
        end=matches[index+1].start()-offset if index+1<len(matches) else len(body)
        alternatives[match.group(1)]=body[match.end()-offset:end].strip()
    return stem,alternatives

def extract(pdf_path: Path) -> dict:
    chunks=[]
    with pdfplumber.open(pdf_path) as pdf:
        for page_number,page in enumerate(pdf.pages,start=1):
            if page_number < 3: continue
            midpoint=page.width/2
            for column,(x0,x1) in [('left',(48,midpoint-5)),('right',(midpoint+5,page.width-45))]:
                crop=page.crop((x0,105,x1,page.height-52))
                text=crop.extract_text(x_tolerance=2,y_tolerance=3,layout=False) or ''
                if 'QUESTÃO' in text.upper() or chunks:
                    chunks.append({'page':page_number,'column':column,'text':text})
    stream='\n'.join(f"\n[[PAGE={c['page']};COL={c['column']}]]\n{c['text']}" for c in chunks)
    all_matches=list(MARKER.finditer(stream));matches=[]
    for candidate in all_matches:
        matches.append(candidate)
        if int(candidate.group(1))==100: break
    questions=[]
    for index,match in enumerate(matches):
        number=int(match.group(1))
        if number>100: continue
        end=matches[index+1].start() if index+1<len(matches) else len(stream)
        raw=stream[match.end():end]
        locators=list(re.finditer(r"\[\[PAGE=(\d+);COL=(left|right)\]\]",stream[:match.start()]))
        locator=locators[-1] if locators else None
        page=int(locator.group(1)) if locator else None
        column=locator.group(2) if locator else None
        raw=re.sub(r"\[\[PAGE=\d+;COL=(?:left|right)\]\]", "", raw)
        body=clean(re.sub(r"QUESTIONÁRIO\s+DE[\s\S]*$",'',raw,flags=re.IGNORECASE))
        stem,alternatives=structure(body);letters=list(alternatives)
        questions.append({'number':number,'page':page,'column':column,'annulled_in_booklet':bool(match.group(2)),'stem':stem,'alternatives':alternatives,'raw_text':body,'alternative_labels':letters,'structurally_complete':letters==['A','B','C','D']})
    unique={};
    for question in questions: unique.setdefault(question['number'],question)
    ordered=[unique[n] for n in sorted(unique)]
    return {'source_file':pdf_path.name,'source_sha256':hashlib.sha256(pdf_path.read_bytes()).hexdigest(),'question_count':len(ordered),'questions':ordered}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('pdf',type=Path);parser.add_argument('output',type=Path);args=parser.parse_args()
    result=extract(args.pdf);args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    incomplete=[q['number'] for q in result['questions'] if not q['structurally_complete']]
    print(json.dumps({'questions':result['question_count'],'incomplete':incomplete},ensure_ascii=False))
if __name__=='__main__':main()
