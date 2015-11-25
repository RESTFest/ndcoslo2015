/*******************************************************
 * todo-mvc implementation 
 * siren representor (server)
 * June 2015
 * Mike Amundsen (@mamund)
 * Soundtrack : Motown Classics Gold (2005)
 *******************************************************/

/* NOTE:  
  - has fatal dependency on: dom-help.js
  - uses no other external libs/frameworks
  
  - built/tested for chrome browser (YMMV on other browsers)
  - designed to act as a "validator" for a human-driven HAL client.
  - not production robust (missing error-handling, perf-tweaking, etc.)
  - report issues to https://github.com/lchbook/
*/

function siren() {

  var d = domHelp();  
  var g = {};
  
  g.url = '';
  g.msg = null;
  g.ctype = "application/x-www-form-urlencoded";
  g.atype = "application/vnd.siren+json";
  g.title = "";
  
  // init library and start
  function init(url, title) {

    g.title = title||"Siren Client";
    
    if(!url || url==='') {
      alert('*** ERROR:\n\nMUST pass starting URL to the library');
    }
    else {
      g.url = url;
      req(g.url,"get");
    }
  }

  // primary loop
  function parseMsg() {
    sirenClear();
    title();
    dump();
    links();
    entities();
    properties();
    actions();
  }

  // handle title for page
  // Siren offers no title so we use our own
  function title() {
    var elm
    
    elm = d.find("title");
    elm.innerText = g.title;
    
    elm = d.tags("title");
    elm[0].innerText = g.title;
  }
  
  // handle response dump
  // just for debugging help
  function dump() {
    var elm = d.find("dump");
    elm.innerText = JSON.stringify(g.msg, null, 2);
  }
    
  // links
  function links() {
    var elm, coll;
    
    elm = d.find("links");
    d.clear(elm);

    if(g.msg.links) {
      coll = g.msg.links;
      menu = d.node("div");
      menu.className = "ui blue fixed top menu";
      menu.onclick = httpGet;

      for(var link of coll) {
        item = d.node("li");
        item.className = "item";
        a = d.anchor({
          rel:link.rel.join(" "),
          href:link.href,
          text:link.title||link.href, 
          className:link.class.join(" "),
          type:link.type||""
        });
        d.push(a, item);
        d.push(item, menu);
      }
      d.push(menu, elm);
    }
  }

  // entities
  function entities() {
    var elm, coll;
    var ul, li, dl, dt, dd, a, p;
    
    elm = d.find("entities");
    d.clear(elm);
    
    if(g.msg.entities) {
      
      coll = g.msg.entities;
      for(var item of coll) {
        segment = d.node("div");
        segment.className = "ui segment";
        
        a = d.anchor({
          href:item.href,
          rel:item.rel.join(" "),
          className:item.class.join(" "),
          text:item.title||item.href});
        a.onclick = httpGet;
        d.push(a, segment);

        table = d.node("table");
        table.className = "ui very basic collapsing celled table";
        for(var prop in item) {
          if(prop!=="href" && 
            prop!=="class" && 
            prop!=="type" && 
            prop!=="rel") {
            tr = d.data_row({
              className:"item "+item.class.join(" "),
              text:prop+"&nbsp;",
              value:item[prop]+"&nbsp;"
            });
            d.push(tr,table);
          }
        }
        d.push(table, segment);
        d.push(segment, elm);
      }
    }
  }
  
  // actions  
  function actions() {
    var elm, coll;
    var ul, li, frm, lg, fs, fld, inp, p;
    
    elm = d.find("actions");
    d.clear(elm);

    if(g.msg.actions) {
      coll = g.msg.actions;
      for(var act of coll) {
        segment = d.node("div");
        segment.className = "ui segment";
        frm = d.node("form");
        frm.id = act.name;
        frm.method = act.method;
        frm.action = act.href;
        frm.onsubmit = httpForm;
        fs = d.node("div");
        fs.className = "ui form";
        header = d.node("div");
        header.innerHTML = act.title;
        header.className = "ui dividing header";
        d.push(header, fs);
        for (var fld of act.fields) {
          p = d.input({
            "prompt" : fld.title||fld.name,
            "name" : fld.name,
            "className" : fld.class.join(" "),
            "value" : fld.value||"",
            "type" : fld.type||"text"});
          d.push(p,fs);                    
        }
        p = d.node("p");
        inp = d.node("input");
        inp.type = "submit";
        inp.className = "ui mini submit button";
        d.push(inp, p);
        d.push(p, fs);
        
        d.push(fs, frm);
        d.push(frm, segment);
        d.push(segment, elm);
      }
    }
  }  
  
  // properties
  function properties() {
    var elm, coll;
    var ul, dl, dt, dd, a, p;
    
    elm = d.find("properties");
    d.clear(elm);
    
    if(g.msg.properties) {
      segment = d.node("div");
      segment.className = "ui segment";
      table = d.node("table");
      table.className = "ui very basic collapsing celled table";
      coll = g.msg.properties;
      for(var prop in coll) {        
        tr = d.data_row({
          className:"item "+g.msg.class.join(" ")||"",
          text:prop+"&nbsp;",
          value:coll[prop]+"&nbsp;"
        });
        d.push(tr, table);
      }
      d.push(table, segment);
      d.push(segment, elm);
    }
  }  

  // ***************************
  // siren helpers
  // ***************************

  // clear out the page
  function sirenClear() {
    var elm;

    elm = d.find("dump");
    d.clear(elm);
    elm = d.find("links");
    d.clear(elm);
    elm = d.find("actions");
    d.clear(elm);
    elm = d.find("entities");
    d.clear(elm);
    elm = d.find("properties");
    d.clear(elm);
  }

  // ********************************
  // ajax helpers
  // ********************************  

  // mid-level HTTP handlers
  function httpGet(e) {
    req(e.target.href, "get", null);
    return false;
  }

  function httpForm(e) {
    var form, coll, method, url, i, x, args, body;

    body = null;
    args = {};
    form = e.target;
    url = form.action; 
    method = form.method.toLowerCase();
    nodes = d.tags("input", form);
    for (i = 0, x = nodes.length; i < x; i++) {
      if (nodes[i].name && nodes[i].name !== '') {
        args[nodes[i].name] = nodes[i].value;
      }
    }
    if(method==="get") {
      i = 0;
      for(var inp in args) {
        if(i===0) {
          url +="?";
          i++;
        }
        else {
          url +="&";
        }
        url += inp + "=" + args[inp];
      }
    }
    else {
      body = "";
      for(var inp in args) {
        if(body!=="") {
          body += "&";
        }
        body += inp + "=" + args[inp];
      }
    }
    req(url, method, body);
    return false;
  }
  
  // low-level HTTP stuff
  function req(url, method, body, content, accept) {
    var ajax = new XMLHttpRequest();
    ajax.onreadystatechange = function(){rsp(ajax)};
    ajax.open(method, url);
    ajax.setRequestHeader("accept",accept||g.atype);
    if(body && body!==null) {
      ajax.setRequestHeader("content-type", content||g.ctype);
    }
    ajax.send(body);
  }
  
  function rsp(ajax) {
    if(ajax.readyState===4) {
      g.msg = JSON.parse(ajax.responseText);
      parseMsg();
    }
  }

  // export function
  var that = {};
  that.init = init;
  return that;
}

// *** EOD ***
