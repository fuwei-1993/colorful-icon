export function createContentLoaded(svgSymbolString: string) {
  return `;(function (w) {
   
    function IEContentLoaded(w, fn) {
      var document = w.document
      var isDone = false
      function init() {
        if (!isDone) {
          isDone = true
          fn()
        }
      }
  
      function IePolyfill() {
        try {
          document.documentElement.doScroll('left')
        } catch (e) {
          setTimeout(IEContentLoaded, 50)
          return
        }
        init()
      }
      IePolyfill()
  
      document.onreadystatechange = function () {
        if (document.readyState == 'complete') {
          document.onreadystatechange = null
          init()
        }
      }
    }

    function completed() {
      var div = w.document.createElement('div')
      div.innerHTML = '${svgSymbolString}'
      w.document.body.insertBefore(div.firstChild, w.document.body.firstChild)
    }
    if (w.document.addEventListener) {
      w.document.addEventListener('DOMContentLoaded', completed, false)
    } else {
      IEContentLoaded(w, completed)
    }
  })(window)`
}
