// Test: does new Function() work with Chinese chars in single quotes?
try{
  var fn=new Function("return { success: false, errMsg: '"+"hello"+"' };");
  console.log("Simple works: "+JSON.stringify(fn()));
}catch(e){
  console.log("Simple fails: "+e.message);
}

// Try with Chinese
try{
  var fn=new Function("return { success: false, errMsg: '"+"??"+"' };");
  console.log("Chinese works: "+JSON.stringify(fn()));
}catch(e){
  console.log("Chinese fails: "+e.message);
}
