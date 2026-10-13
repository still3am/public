// Translate source-authored UI strings; never inspect or mutate rendered DOM.
module.exports=function({types:t}) {
 const attrs=new Set(['title','placeholder','aria-label','description','label']);
 return {visitor:{
  Program:{enter(p,state){state.used=false;},exit(p,state){if(state.used)p.unshiftContainer('body',t.importDeclaration([t.importSpecifier(t.identifier('PublicText'),t.identifier('PublicText')),t.importSpecifier(t.identifier('PublicElement'),t.identifier('PublicElement'))],t.stringLiteral('@/lib/i18n/LanguageContext')));}},
  JSXElement:{exit(p,state){
   if(['PublicText','PublicElement'].includes(p.node.openingElement.name.name))return;
   const translateExpression=e=>{
    if(t.isStringLiteral(e)&&/[a-zA-Z]{2}/.test(e.value)){state.used=true;return t.jsxElement(t.jsxOpeningElement(t.jsxIdentifier('PublicText'),[t.jsxAttribute(t.jsxIdentifier('text'),t.jsxExpressionContainer(e))],true),null,[],true);}
    if(t.isConditionalExpression(e))return t.conditionalExpression(e.test,translateExpression(e.consequent),translateExpression(e.alternate));
    if(t.isLogicalExpression(e))return t.logicalExpression(e.operator,e.left,translateExpression(e.right));
    if(t.isTemplateLiteral(e)&&e.quasis.some(q=>/[a-zA-Z]{2}/.test(q.value.cooked||''))){
     const key=e.quasis.map((q,i)=>(q.value.cooked||'')+(i<e.expressions.length?'{{'+i+'}}':'')).join('');
     state.used=true;return t.jsxElement(t.jsxOpeningElement(t.jsxIdentifier('PublicText'),[t.jsxAttribute(t.jsxIdentifier('text'),t.stringLiteral(key)),t.jsxAttribute(t.jsxIdentifier('values'),t.jsxExpressionContainer(t.arrayExpression(e.expressions)))],true),null,[],true);
    }
    if(t.isIdentifier(e)&&/^(label|statusLabel)$/.test(e.name)||t.isMemberExpression(e)&&t.isIdentifier(e.property,{name:'label'})){
     state.used=true;return t.jsxElement(t.jsxOpeningElement(t.jsxIdentifier('PublicText'),[t.jsxAttribute(t.jsxIdentifier('text'),t.jsxExpressionContainer(e))],true),null,[],true);
    }
    return e;
   };
   p.node.children=p.node.children.map(c=>{
    if(t.isJSXText(c)){
     // Follow JSX whitespace rules instead of collapsing meaningful inline spaces.
     const lines=c.value.split(/\r\n|\n|\r/);let text='';
     lines.forEach((line,i)=>{let v=line.replace(/\t/g,' ');if(i!==0)v=v.replace(/^ +/,'');if(i!==lines.length-1)v=v.replace(/ +$/,'');if(v)text+=v+(i<lines.length-1?' ':'');});
     if(!/[a-zA-Z]{2}/.test(text))return c;
     return t.jsxExpressionContainer(translateExpression(t.stringLiteral(text)));
    }
    if(t.isJSXExpressionContainer(c))c.expression=translateExpression(c.expression);
    return c;
   });
   const keys=[];
   p.node.openingElement.attributes.forEach(a=>{if(t.isJSXAttribute(a)&&attrs.has(a.name.name)&&t.isStringLiteral(a.value))keys.push(a.name.name);});
   if(keys.length){state.used=true;const original=p.node;p.replaceWith(t.jsxElement(t.jsxOpeningElement(t.jsxIdentifier('PublicElement'),[t.jsxAttribute(t.jsxIdentifier('element'),t.jsxExpressionContainer(original)),t.jsxAttribute(t.jsxIdentifier('fields'),t.jsxExpressionContainer(t.arrayExpression(keys.map(k=>t.stringLiteral(k)))))],true),null,[],true));p.skip();}
  }}
 }};
};
