/*******************************************************
 * hal-json HTML/SPA client engine
 * May 2015
 * Mike Amundsen (@mamund)
 * Soundtrack : Red Clay : Freddie Hubbard
 *******************************************************/

/* NOTE:
  - no support for:
  - _links.curies
  - relies on a customer halForms() implementation
  
  - has fatal dependency on:
    - uritemplate.js
    - dom-help.js
  - uses no other external libs/frameworks
  
  - built/tested for chrome browser (YMMV on other browsers)
  - designed to act as a "validator" for a human-driven HAL client.
  - not production robust (missing error-handling, perf-tweaking, etc.)
  - report issues to https://github.com/lchbook/
*/

function hal() {

  var forms = halForms();
  var d = domHelp();  
  var g = {};
  
  g.url = '';
  g.hal = null;
  g.ctype = "application/vnd.hal+json";
  g.title = "";
  
  // init library and start
  function init(url, title) {

    g.title = title||"HAL Client";
    
    if(!url || url==='') {
      alert('*** ERROR:\n\nMUST pass starting URL to the HAL library');
    }
    else {
      g.url = url;
      req(g.url,"get");
    }
  }

  // primary loop
  function parseHAL() {
    halClear();
    title();
    dump();
    links();
    embedded();
    properties();
  }

  // handle title for page
  // HAL offers no title so we use our own
  function title() {
    var elm = d.find("title");
    elm.innerText = g.title;
  }
  
  // handle response dump
  // just for debugging help
  function dump() {
    var elm = d.find("dump");
    elm.innerText = JSON.stringify(g.hal, null, 2);
  }
    
  // _links
  // the real stuff starts here
  function links() {
    var elm, coll;
    var menu, item, a, sel, opt;
    
    elm = d.find("links");
    d.clear(elm);
    if(g.hal._links) {
      coll = g.hal._links;
      menu = d.node("div");
      menu.className = "ui blue fixed top menu";
      
      for(var link in coll) {
        // render link collections as HTML select
        if(Array.isArray(coll[link])===true) {
          sel = d.node("select");          
          sel.onclick = halSelect;
          opt = d.option({text:"Select",value:""});
          d.push(opt,sel);
          
          for(var ary in coll[link]) {
            opt = d.option({
              text:(coll[link][ary].title||coll[link][ary].href),
              value:coll[link][ary].href
            });
            // add custom attributes
            opt.setAttribute("rel",link);
            opt.setAttribute("href",coll[link][ary].href);
            opt.setAttribute("templated",coll[link][ary].templated||"false");
            opt = halAttributes(opt, coll[link][ary]);
            d.push(opt, sel);
          }

          item = d.node("li");
          item.className = "item";
          d.push(sel, item);
          d.push(item, menu);
        }
        else {
          a = d.anchor({
            rel:link,
            href:coll[link].href,
            title:(coll[link].title||coll[link].href),
            text:(coll[link].title||coll[link].href)
          });
          // add custom attributes
          a.setAttribute("templated", coll[link].templated||"false");
          a = halAttributes(a,coll[link]);
          
          item = d.node("li");
          item.onclick = halLink;
          item.className = "item";
          d.push(a, item);
          d.push(item, menu);
        }
      }
      d.push(menu, elm);
    }
  }

  // _embedded
  // handle any embedded content
  function embedded() {
    var elm, embeds;
    var segment, table, tr;
    
    elm = d.find("embedded");
    d.clear(elm);
    
    if(g.hal._embedded) {
      
      // get all the rel/sets for this response
      embeds = g.hal._embedded;
      for(var coll in embeds) {

        p = d.para({text:coll, className:"ui header segment"});
        d.push(p,elm);
        
        // get all the links for this rel/set
        items = embeds[coll];
        for(var itm of items) {
          segment = d.node("div");
          segment.className = "ui segment";
          
          // pluck href from the properties
          a = d.anchor({
            rel:coll,
            href:itm.href||'#',
            title:itm.href||coll,
            text:itm.href||coll
          });
          a.setAttribute("templated", itm.templated||"false");
          a = halAttributes(a,itm);
          a.onclick = halLink;
          d.push(a,segment);
          d.push(segment, elm);
          
          // emit all the properties for this item
          table = d.node("table");
          table.className = "ui very basic collapsing celled table";
          for(var prop in itm) {
            if(prop!=="href") {
              tr = d.data_row({className:"property "+prop,text:prop+"&nbsp;",value:itm[prop]+"&nbsp;"});
              d.push(tr,table);
            }
          }
          d.push(table,segment);
          d.push(segment, elm);
        }        
      }
    }
  }
  
  // properties
  // emit any root-level properties
  function properties() {
    var elm, coll;
    var segment, table, tr;
    
    elm = d.find("properties");
    d.clear(elm);
    segment = d.node("div");
    segment.className = "ui segment";
    
    table = d.node("table");
    table.className = "ui very basic collapsing celled table";
    for(var prop in g.hal) {
      if(prop!=="_links" && prop!=="_embedded") {      
        tr = d.data_row({className:"property "+prop,text:prop+"&nbsp;",value:g.hal[prop]+"&nbsp;"});
        d.push(tr,table);
      }
    }
    d.push(table,segment);
    d.push(segment,elm);
  }  
  
  // show form for input
  // this is a custom experience
  // see the halForms() lib for inputs
  function halShowForm(f, href, title) {
    var elm, coll, val;
    var form, header, fs, p, inp;
     
    elm = d.find("form");
    d.clear(elm);

    form = d.node("form");
    form.action = href;
    form.method = f.method;
    form.setAttribute("halmethod", f.method);
    form.className = f.rel;
    form.onsubmit = halSubmit;
    fs = d.node("div");
    fs.className = "ui form";
    header = d.node("div");
    header.innerHTML = title||"Form";
    header.className = "ui dividing header";
    d.push(header, fs);

    coll = f.properties;
    for(var prop of coll) {
      segment = d.node("div");
      segment.className = "ui segment";

      val = prop.value;
      if(g.hal[prop.name]) {
        val = val.replace("{"+prop.name+"}",g.hal[prop.name]);
      } 
      p = d.input({
        prompt:prop.prompt,
        name:prop.name,
        value:val, 
        required:prop.required,
        readOnly:prop.readOnly
      });
      d.push(p,fs);
    }
    
    p = d.node("p");
    inp = d.node("input");
    inp.type = "submit";
    inp.className = "ui mini positive button";
    d.push(inp,p);

    inp = d.node("input");
    inp.type = "button";
    inp.value = "Cancel";
    inp.onclick = function(){elm = d.find("form");d.clear(elm);}
    inp.className = "ui mini button";
    d.push(inp,p);

    d.push(p,fs);            
    d.push(fs,form);
    d.push(form, segment);
    d.push(segment, elm);
  }  
  
  // ***************************
  // hal helpers
  // ***************************

  // handle hal-specific attributes
  function halAttributes(elm,link) {
    var coll;
    
    coll = ["deprecation","type","name","profile","hreflang"]
    
    for(var attr of coll) {
      if(link[attr] && link[attr]!=="") {
        elm.setAttribute(attr,link[attr]);
      }
    }
    return elm;  
  }
  
  // clear out the page
  function halClear() {
    var elm;

    elm = d.find("dump");
    d.clear(elm);
    elm = d.find("links");
    d.clear(elm);
    elm = d.find("form");
    d.clear(elm);
    elm = d.find("properties");
    d.clear(elm);
  }

  // handle GET for select
  function halSelect(e) {
    var elm, href, accept;

    elm = e.target;
    href = elm.options[elm.selectedIndex].value;
    accept = elm.options[elm.selectedIndex].getAttribute("type"); 
    if(href && href!=="") {
      req(href, "get", null, null, accept||g.ctype);
    }
    return false;
  }

  // handle GET for links
  function halLink(e) {
    var elm, form, href, accept;

    elm = e.target;
    accept = elm.getAttribute("type"); 

    form = forms.lookUp(elm.rel);
    if(form && form!==null) {
      halShowForm(form, elm.href, elm.title);
    }
    else {
      req(elm.href, "get", null, null, accept||g.ctype);
    }
    return false;    
  }

  // handle parameterized requests
  // all forms submits are processed here
  function halSubmit(e) {
    var form, query, nodes, i, x, args, url, method, template, accept;
    
    args = {};
    form = e.target;
    query = form.action.replace(/%7B/,'{'); // hack
    template = UriTemplate.parse(query);
    method = form.getAttribute("halmethod")||form.method;
    accept = form.getAttribute("type")||g.ctype;
    
    // gather inputs
    nodes = d.tags("input", form);
    for(i=0, x=nodes.length;i<x;i++) {
      if(nodes[i].name && nodes[i].name!=='') {
        args[nodes[i].name] = nodes[i].value;
      }
    }

    // resolve any URITemplates
    url = template.expand(args);

    // force app/json for bodies    
    if(method!=="get" && method!=="delete") {
      req(url, method, JSON.stringify(args), "application/json", accept);
    }
    else {
      req(url, method ,null, null, accept);
    }
    return false;
  }
  
  // ********************************
  // ajax helpers
  // ********************************  
  
  // low-level HTTP stuff
  function req(url, method, body, content, accept) {
    var ajax = new XMLHttpRequest();
    ajax.onreadystatechange = function(){rsp(ajax)};
    ajax.open(method, url);
    ajax.setRequestHeader("accept",accept||g.ctype);
    if(body && body!==null) {
      ajax.setRequestHeader("content-type", content||g.ctype);
    }
    ajax.send(body);
  }
  
  function rsp(ajax) {
    if(ajax.readyState===4) {
      g.hal = JSON.parse(ajax.responseText);
      parseHAL();
    }
  }

  // export function
  var that = {};
  that.init = init;
  return that;
}

/***************************
 FORMS for HAL-JSON
 
 This is a custom implementation to support human input forms for HAL
 - define a form (rel, method, arguments)
 - set rel == hal._link.rel
 - halForms.loolkup(re) : use rel as a lookup at runtime to get form definition
 - display form (see halShowForm) and handle submission

 NOTE:
 optionally, halForms.lookup(rel) could call an external service 
 using the rel as a URL that returns the JSON definition
 
 **************************/
function halForms() {

  // return form
  function lookUp(rel) {
    var rtn, i, x;

    for(i=0, x=forms.length;i<x;i++) {
      if(rel.indexOf(forms[i].rel)!==-1) {
        rtn = forms[i];
        break;
      }
    }
    return rtn;
  }  

  // load forms once
  var forms = [];
  forms.push({
    rel:"/files/hal-todo.html#create-form",
    method:"post",
    properties: [
      {name:"title",required:true, value:"", prompt:"Title", regex:""},
      {name:"completed",required:false,value:"false", prompt:"Completed", regex:""}
    ]
  });

  forms.push({
    rel:"/files/hal-todo.html#edit",
    method:"put",
    properties: [
      {name:"id",required:true, value:"{id}", prompt:"ID", readOnly:true},
      {name:"title",required:true, value:"{title}", prompt:"Title", regex:""},
      {name:"completed",required:false,value:"{completed}", prompt:"Completed", regex:""}
    ]
  });

  forms.push({
    rel:"/files/hal-todo.html#remove",
    method:"delete",
    properties: [
      {name:"id",required:true, value:"{id}", prompt:"ID", readOnly:true}
    ]
  });

  forms.push({
    rel:"/files/hal-todo.html#active",
    method:"get",
    properties: [
      {name:"completed",value:"false", prompt:"Completed", readOnly:true}
    ]
  });

  forms.push({
    rel:"/files/hal-todo.html#completed",
    method:"get",
    properties: [
      {name:"completed",value:"true", prompt:"Completed",readOnly:true}
    ]
  });
    
  var that = {};
  that.lookUp = lookUp;

  return that;
}

// *** EOD ***
