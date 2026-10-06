import sanitizeHtml from 'sanitize-html'
const PX = [/^\d+(\.\d+)?px$/]
const OPTIONS = {
 allowedTags: ['h2','h3','h4','p','br','strong','b','em','i','u','s','mark','code','pre','blockquote','ul','ol','li','hr','a','img','figure','figcaption','table','colgroup','col','thead','tbody','tr','th','td','span'],
 allowedAttributes: { a:['href','target','rel'], img:['src','alt','title','width','height'], th:['colspan','rowspan','colwidth'], td:['colspan','rowspan','colwidth'], ol:['start'], '*':['style','dir'] },
 allowedStyles: { '*': { 'text-align': [/^(left|right|center|justify)$/] }, col:{width:PX,'min-width':PX}, table:{width:PX,'min-width':PX} },
 allowedSchemes: ['http','https','mailto','tel'], allowedSchemesByTag: { img:['http','https'] }, allowProtocolRelative:false,
 transformTags: { a:(tagName, attribs)=>({tagName, attribs:{...attribs, rel:'noopener noreferrer nofollow', ...(attribs.target?{target:'_blank'}:{})}}) }
}
const ENTITIES = {'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'",'&nbsp;':' '}
const decode = s => s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, m => ENTITIES[m])
const textOf = html => decode(html.replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim()
const slugify = text => text.toLowerCase().replace(/[\u200c\s]+/g,'-').replace(/[^\p{L}\p{N}-]/gu,'').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,80)
function addHeadingIds(html){ const used=new Map(), toc=[]; const out=html.replace(/<h([2-4])((?:\s[^>]*)?)>([\s\S]*?)<\/h\1>/g,(m,l,a,i)=>{const text=textOf(i);if(!text)return m;const base=slugify(text)||'section',n=used.get(base)||0;used.set(base,n+1);const id=n?`${base}-${n+1}`:base;toc.push({id,level:Number(l),text:text.slice(0,200)});return `<h${l} id="${id}"${a}>${i}</h${l}>`});return {html:out,toc} }
export function prepareContent(rawHtml){ const clean=sanitizeHtml(rawHtml||'',OPTIONS), {html,toc}=addHeadingIds(clean), text=textOf(html), words=text?text.split(' ').length:0; return {html,toc,readingMinutes:Math.max(1,Math.round(words/200)),autoExcerpt:text.length>180?`${text.slice(0,180).replace(/\s+\S*$/,'')}…`:text,isEmpty:!text&&!/<img\s/i.test(html)} }
