(function(){
  var DATA = null;
  var OV = {};

  var statusEl = document.getElementById('status');
  var listEl = document.getElementById('list');
  var emptyEl = document.getElementById('empty');
  var countEl = document.getElementById('count');
  var fbIndex = document.getElementById('fbIndex');
  var fbStock = document.getElementById('fbStock');

  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}

  function extractData(html){
    var m = html.match(/var DATA\s*=\s*(\[[\s\S]*\]);\s*\n\s*var OV/);
    if(!m) return null;
    try{ return JSON.parse(m[1]); }catch(e){ return null; }
  }

  function pad(n){return n<10?'0'+n:''+n;}
  function nowStamp(){
    var d=new Date();
    return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes());
  }

  function loadIndexHtml(){
    return fetch('index.html',{cache:'no-store'}).then(function(r){
      if(!r.ok) throw new Error('fetch failed');
      return r.text();
    }).then(function(html){
      var d = extractData(html);
      if(!d) throw new Error('parse failed');
      DATA = d;
    }).catch(function(){
      fbIndex.className = 'fallback show';
      DATA = null;
    });
  }

  function loadStockJson(){
    return fetch('stock.json',{cache:'no-store'}).then(function(r){
      return r.ok ? r.json() : {};
    }).then(function(j){
      OV = (j && typeof j==='object') ? j : {};
    }).catch(function(){
      fbStock.className = 'fallback show';
      OV = {};
    });
  }

  document.getElementById('fileIndex').addEventListener('change', function(e){
    var f = e.target.files[0]; if(!f) return;
    var reader = new FileReader();
    reader.onload = function(){
      var d = extractData(reader.result);
      if(d){ DATA = d; fbIndex.className='fallback'; buildList(); }
      else { alert('index.html から商品データを読み取れませんでした。'); }
    };
    reader.readAsText(f);
  });

  document.getElementById('fileStock').addEventListener('change', function(e){
    var f = e.target.files[0]; if(!f) return;
    var reader = new FileReader();
    reader.onload = function(){
      try{
        var j = JSON.parse(reader.result);
        OV = (j && typeof j==='object') ? j : {};
        fbStock.className='fallback';
        buildList();
      }catch(err){ alert('stock.json の読み込みに失敗しました。JSON形式を確認してください。'); }
    };
    reader.readAsText(f);
  });

  function effPrice(id,i,base){var o=OV[id];if(o&&o.ranks&&o.ranks[i]&&o.ranks[i].price!=null)return o.ranks[i].price;return base;}
  function effStock(id,i,base){var o=OV[id];if(o&&o.ranks&&o.ranks[i]&&o.ranks[i].stock!=null)return o.ranks[i].stock;return base;}
  function effHidden(id){var o=OV[id];return !!(o&&o.hidden===true);}

  function rowHtml(p){
    var hidden = effHidden(p.id);
    var ranks = (p.ranks||[]).map(function(r,i){
      var pr = effPrice(p.id,i,r.price), st = effStock(p.id,i,r.stock);
      return '<div class="rank"><span class="cond">'+esc(r.cond)+'</span>'+
        '<label>価格(円)</label><input type="number" class="priceInput" data-id="'+p.id+'" data-i="'+i+'" data-base="'+r.price+'" value="'+pr+'">'+
        '<label>在庫</label><input type="number" class="stockInput" data-id="'+p.id+'" data-i="'+i+'" data-base="'+r.stock+'" value="'+st+'">'+
        '</div>';
    }).join('');
    return '<div class="item" data-pid="'+p.id+'">'+
      (p.img?'<img class="thumb" loading="lazy" src="'+esc(p.img)+'" alt="">':'<div class="thumb"></div>')+
      '<div class="info"><div class="pname">'+esc(p.nameEn||p.name)+'<span class="jp">'+esc(p.name)+'</span></div>'+
      '<div class="tags">'+esc(p.type)+' ・ '+esc(p.series)+(p.item_id?' ・ '+esc(p.item_id):'')+'</div></div>'+
      '<div class="ranks">'+ranks+'</div>'+
      '<label class="hidewrap"><input type="checkbox" class="hideInput" data-id="'+p.id+'" '+(hidden?'checked':'')+'> 非表示（品切れ/掲載停止）</label>'+
      '</div>';
  }

  function markChanged(itemEl){
    var changed = false;
    itemEl.querySelectorAll('.priceInput,.stockInput').forEach(function(inp){
      if(String(inp.value) !== String(inp.dataset.base)) changed = true;
    });
    if(itemEl.querySelector('.hideInput').checked) changed = true;
    itemEl.classList.toggle('changed', changed);
  }

  function buildList(){
    if(!DATA){ statusEl.textContent = '商品データを読み込めませんでした。上のフォームから index.html を選択してください。'; return; }
    statusEl.innerHTML = '<b>'+DATA.length+'</b> 件の商品を読み込みました。編集後は必ず下の「ダウンロード」ボタンを押してください。';

    var q = document.getElementById('q');
    var fcat = document.getElementById('fcat');
    var fseries = document.getElementById('fseries');
    var fstock = document.getElementById('fstock');

    function currentStockOf(p){
      var st = 0;
      (p.ranks||[]).forEach(function(r,i){ st += Number(effStock(p.id,i,r.stock))||0; });
      return st;
    }

    function render(){
      var qq = (q.value||'').toLowerCase().trim();
      var list = DATA.filter(function(p){
        if(fcat.value && p.type!==fcat.value) return false;
        if(fseries.value && p.series!==fseries.value) return false;
        if(qq){
          var hay = ((p.nameEn||'')+' '+(p.name||'')+' '+(p.code||'')+' '+(p.series||'')).toLowerCase();
          if(hay.indexOf(qq)<0) return false;
        }
        if(fstock.value!==''){
          var th = Number(fstock.value);
          if(currentStockOf(p) > th) return false;
        }
        return true;
      });
      listEl.innerHTML = list.map(rowHtml).join('');
      countEl.textContent = list.length + ' / ' + DATA.length + ' 件表示';
      emptyEl.style.display = list.length ? 'none' : 'block';
      listEl.querySelectorAll('.item').forEach(function(itemEl){
        itemEl.querySelectorAll('input').forEach(function(inp){
          inp.addEventListener('input', function(){ markChanged(itemEl); });
          inp.addEventListener('change', function(){ markChanged(itemEl); });
        });
      });
    }

    [q,fcat,fseries,fstock].forEach(function(el){
      el.addEventListener('input', render);
      el.addEventListener('change', render);
    });
    render();
  }

  document.getElementById('downloadBtn').addEventListener('click', function(){
    if(!DATA){ alert('商品データが読み込まれていません。'); return; }
    var overrides = {};
    DATA.forEach(function(p){
      var hideEl = document.querySelector('.hideInput[data-id="'+p.id+'"]');
      var hidden = hideEl ? hideEl.checked : effHidden(p.id);
      var changed = (hidden !== effHidden(p.id));
      var ranks = (p.ranks||[]).map(function(r,i){
        var priceEl = document.querySelector('.priceInput[data-id="'+p.id+'"][data-i="'+i+'"]');
        var stockEl = document.querySelector('.stockInput[data-id="'+p.id+'"][data-i="'+i+'"]');
        var price = priceEl ? Number(priceEl.value) : effPrice(p.id,i,r.price);
        var stock = stockEl ? Number(stockEl.value) : effStock(p.id,i,r.stock);
        if(isNaN(price)) price = r.price;
        if(isNaN(stock)) stock = r.stock;
        if(price !== r.price || stock !== r.stock) changed = true;
        return {price:price, stock:stock};
      });
      if(changed){
        var entry = {ranks: ranks};
        if(hidden) entry.hidden = true;
        overrides[String(p.id)] = entry;
      }
    });
    var stamp = nowStamp();
    overrides._updatedAt = stamp;
    var blob = new Blob([JSON.stringify(overrides, null, 2)], {type:'application/json'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'stock.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    document.getElementById('tsPreview').textContent = '最終書き出し: ' + stamp + '（変更 ' + (Object.keys(overrides).length-1) + ' 件）';
  });

  document.getElementById('resetBtn').addEventListener('click', function(){
    if(confirm('全ての編集内容を破棄して、現在保存されている stock.json の内容に戻します。よろしいですか？')){
      buildList();
    }
  });

  Promise.all([loadIndexHtml(), loadStockJson()]).then(function(){
    buildList();
  });
})();
