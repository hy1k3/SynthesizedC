
rule = '"if" x:Any "{" "}" -> IfExpr '

start = { 
  str: rule,
  blocked: false
};

console.log(start)


function readAny(state)
{
  var is_blocked = state.str.length == 0;
  
  var next_state = {
    str: !is_blocked ? state.str.substr(1) : '',
    blocked: is_blocked,
  }; 

  var value = !is_blocked ? state.str[0] : undefined;
  
  return [value, next_state];
}

function isFailedState(state)
{
  return state.blocked;
}

function readFailed(state)
{
  return [null, { 
    str: state.str, 
    blocked: true 
  }];
}

function readOr(state, parseFn1, parseFn2)
{
  let [value1, new_state1] = parseFn1(state);
  if (!isFailedState(new_state1))
    return [value1, new_state1];

  let [value2, new_state2] = parseFn2(state);
  if (!isFailedState(new_state2))
    return [value2, new_state2];

  // Parse failed.
  return readFailed(state);
}

function readStar(state, parseFn)
{
  let [new_value, new_state] = parseFn(state)
  if (isFailedState(new_state))
    return [[], state];

  // Parsing succeeded. Set new state.
  let [rest_value, rest_state] = readStar(new_state, parseFn);

  return [[new_value].concat(rest_value), rest_state];
}

function readPlus(state, parseFn)
{
  let [new_value, new_state] = parseFn(state)
  if (isFailedState(new_state))
    return readFailed(state);

  // Parsing succeeded. Set new state.
  let [rest_value, rest_state] = readStar(new_state, parseFn);

  return [rest_value.concat(new_value), rest_state];
}

function readNot(state, parseFn)
{
  let [new_value, new_state] = parseFn(state)
  if (isFailedState(new_state))
    return [null, state];

  return readFailed(state);
}


//
// Any:ch $(ch == ' ' | ch == '\r' | ch == '\n') -> WhiteSpace:w w.value = ch
//
function readWhiteSpace(state) 
{
  let [ch, s0] = readAny(state);

  if (!(ch == ' ' || ch == '\r' || ch == '\n'))
    return readFailed(state);
  
  return [{ type: 'WhiteSpace', value: ch }, s0];
}

//
// Expr:e '*' -> Star:s s.expr = e
//
function readStar2(state)
{
  let [v0, s0] = readExpr(state);
  if (isFailedState(s0))
    return readFailed(state);

  let var_e = v0;
  
  let [v1, s1] = readAny(s0);
  if (isFailedState(s1))
    return readFailed(state);

  if (!(v1 == '*'))
    return readFailed(state);

  return [{type: 'Star', expr: var_e }, s1];
}

//
// Expr:e '+' -> Plus:p p.expr = e
//
function readPlus(state)
{
  let [v0, s0] = readExpr(state);
  if (isFailedState(s0))
    return readFailed(state);

  let var_e = v0;
  
  let [v1, s1] = readAny(s0);
  if (isFailedState(s1))
    return readFailed(state);

  if (!(v1 == '+'))
    return readFailed(state);

  return [{type: 'Plus', expr: var_e }, s1];
}

//
// '(' Rule:r ')' -> r
//
function readBrackets(state)
{
  let [v0, s0] = readAny(state);
  if (isFailedState(s0))
    return readFailed(state);

  if (!(v0 == '('))
    return readFailed(state);
    
  let [v1, s1] = readRule(s0);
  if (isFailedState(s1))
    return readFailed(state);

  let var_r = v1;
  
  let [v2, s2] = readAny(s1);
  if (isFailedState(s2))
    return readFailed(state);

  if (!(v2 == ')'))
    return readFailed(state);

  return [var_r, s2];
}

function readBoundString(state, str)
{
  var cur_state = state;
  
  for (var ch in str)
  {
    let [v,s] = readAny(cur_state);
    if (v != ch)
      return readFailed(state);

    cur_state = s;
  }

  return [str, cur_state];
}

  
//
// '->' Class:c ':' Identifier:i  -> Production:p p.className = c p.id = i
// 
function readProduction(state)
{
  let [v0, s0] = readBoundString(state, "->");
  if (isFailedState(s0))
    return readFailed(state);

  let [v1, s1] = readIdentifier(s0);
  if (isFailedState(s1))
    return readFailed(s0);

  let var_c = v1;

  let [v2, s2] = readBoundString(s1, ":");
  if (isFailedState(s2))
    return readFailed(s1);

  let [v3, s3] = readIdentifier(s2);
  if (isFailedState(s3))
    return readFailed(s2);

  let var_i = v3;
  
  return [{ type: 'Production', className: var_c, id: var_i }, s3];
}

function readExpr(state)
{
  return readFailed(state)  
}

//
// Expr:e ':' Identifier:i -> Assignment:a a.expr = e a.name = i
//
function readAssignment(state)
{
  let [v0, s0] = readExpr(state);
  if (isFailedState(s0))
    return readFailed(state);

  let [v1, s1] = readAny(s0);
  if (isFailedState(s1))
    return readFailed(state);
  
  if (!(v1 == ':'))
    return readFailed(state);

  let [v2, s2] = readIndentifier(s1);
  if (isFailedState(s2))
    return readFailed(state);

  return [{ type:'Assignment', id:i, expr:e }, s2];
}

//
// ExprSequence:e1 | ExprSequence:e2 -> Or:o o.expr1 = e1 o.expr2 = e2
//
function readOr2(state)
{
  let [v0, s0] = readExpr(state);
  if (isFailedState(s0))
    return readFailed(state);

  let var_e1 = v0;

  let [v1, s1] = readAny(state);
  if (isFailedState(s1))
    return readFailed(state);

  if (!(v0 == '|'))
    return readFailed(state);

  let [v2, s2] = readExpr(s1);
  if (isFailedState(s2))
    return readFailed(state);

  let var_e2 = v2;
  
  return [{ type: 'Or', expr1: var_e1, expr2: var_e2 }, s2];
}

//
// '!' Expr:e -> Not:n n.expr = e
//
function readNot2(state)
{
  let [v0, s0] = readAny(state);
  if (isFailedState(s0))
    return readFailed(state);
  
  if (!(v0 == '!'))
    return readFailed(state);

  let [v1, s1] = readExpr(s0);
  if (isFailedState(s1))
    return readFailed(state);

  let var_e = v1;
  
  return [{ type: 'Not', expr: e }, s1];
}

//
// Expr (WhiteSpace Expr)+ Prod?:p -> ExprSequence:s
//
function readAnd(state)
{
  let [v0, s0] = readExpr(state);
  if (isFailedState(s0))
    return readFailed(state);

  let [v1, s1] = readPlus(state, function (state) 
  {
    let [v0, s0] = readWhitespace(state);
    if (isFailedState(s0))
      return readFailed(state);
    
    let [v1, s1] = readExpr(state);
    if (isFailedState(s1))
      return readFailed(state);

    return [v1, s1];
  });

  if (isFailedState(s1))
    return readFailed(state);

  return [{ type: 'Sequence', exprs: [v0].concat(v1) }, s1]
}

var Any = {
  name: "Any"
}

var Not = {
  name: "Not"
}

var Literal = {
  name: "Literal"
}

var ExprSequence = {
  name: "ExprSequence"
}

var OrSequence = {
  name: "OrSequence"
}

var Star = {
  name: "Star"
}

var Plus = {
  name: "Plus"
}

var Production = {
  name: "Production"
}

var Parser = {};

//
// ExprSequence:e1 | ExprSequence:e2 -> Or:o o.expr1 = e1 o.expr2 = e2
//
Parser.Or = {
  type: ExprSequence,
  exprs: [{
    type: ExprSequence,
    name: 'e1'
  }, {
    type: Literal, value: '|'
  }, {
    type: ExprSequence,
    name: 'e2'
  }, {
    
  }]
}



//
// "\"" ("\\" Any | !"\"" Any)*:chs "\"" -> String:s s.value = ('"' + chs.join('') + '"')
//
Parser.String = { 
  type: ExprSequence,
  exprs: [{ 
    type: Literal, value: '"'
  }, { 
    type: Star,
    expr: { 
      type: OrSequence,
      exprs: [{
        type: ExprSequence,
        exprs: [{
          type: Literal, value: '\\'
        }, {
          type: Any
        }]
      }, {
        type: ExprSequence,
        exprs: [{
          type: Not,
          expr: {
            type: Literal, value: '"'
          }
        }, {
          type: Any
        }]
      }]
    }
  }, { 
    type: Literal, value: '"'
  }, { 
    type: Production 
  }]
};

  

function readString(state)
{
  let [v0, s0] = readAny(state);
  if (isFailedState(s0))
    return readFailed(state);

  if (!(v0 == '"'))
    return readFailed(state);

  let [chs, s1] = readStar(s0,
                        state => readOr(state, 
                                        function(state) 
                                        {
                                          let [v0, s0] = readAny(state);
                                          if (isFailedState(s0))
                                            return readFailed(state);
                                          
                                          if (s0 != '\\') 
                                            return readFailed(state);

                                          return readAny(s0); 
                                        }, 
                                        function (state) 
                                        { 
                                          let [v0, s0] = readNot(state, 
                                                           function (state) 
                                                           { 
                                                             let [v0, s0] = readAny(state);
                                                             if (isFailedState(s0))
                                                               return readFailed(state);
                                                             
                                                             if (v0 != '"')
                                                               return readFailed(state);
                                                             
                                                             return [null, state];
                                                           });

                                          if (isFailedState(s0))
                                            return readFailed(state);
                                          
                                          return readAny(state);
                                        })
                         );

  if (isFailedState(s1))
    return readFailed(state);
    

  let [v2, s2] = readAny(s1);
  if (isFailedState(s2))
    return readFailed(state);
  
  if (v2 != '"')
    return readFailed(state);

  return [v0 + chs.join('') + v2, s2]
}





console.log('value: ', readString(start))