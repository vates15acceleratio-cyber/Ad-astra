/* Écran d'accueil : 2,5 s ou un appui, puis glissement vers le haut.
   Indépendant de app.js : l'écran ne peut pas rester bloqué si app.js échoue. */
(function(){
  var s = document.getElementById("splash");
  if(!s) return;
  var done = false;
  function close(){
    if(done) return; done = true;
    s.classList.add("leaving");
    setTimeout(function(){ if(s.parentNode) s.parentNode.removeChild(s); }, 700);
  }
  s.addEventListener("click", close);
  setTimeout(close, 2500);
})();
