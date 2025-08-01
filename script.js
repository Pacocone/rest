/*
 * Simplified client-side script for "Mis Restaurantes".
 *
 * Este archivo reemplaza la lógica original compleja con una versión más
 * directa que funciona correctamente en navegadores de escritorio y móviles.
 * Se centra en tres funcionalidades clave solicitadas por el usuario:
 *   1. Cálculo del precio medio por comensal.
 *   2. Selección y visualización de la valoración por estrellas.
 *   3. Cambio de tema (oscuro, claro y automático) con persistencia.
 * Además incluye un sistema muy básico de persistencia de registro que
 * deshabilita el formulario de inicio de sesión después del primer uso.
 *
 * No depende de Supabase ni de otras librerías externas. Las funciones
 * proporcionadas aquí deberían cubrir la mayoría de las interacciones
 * esenciales y funcionar de manera coherente tanto en iOS como en Android.
 */

(function(){
  'use strict';

  /** Obtiene un elemento por su ID. */
  function byId(id){
    return document.getElementById(id);
  }

  /**
   * Convierte una cadena que representa un número (con coma o punto) en un
   * número flotante. Sustituye los puntos como separador de miles y las
   * comas por puntos para que parseFloat lo entienda. Devuelve 0 si no
   * encuentra un número válido.
   */
  function parseNumber(str){
    var s = String(str || '').trim();
    if(!s) return 0;
    // Elimina separadores de miles (puntos) y cambia la coma decimal por punto.
    s = s.replace(/\./g, '');
    s = s.replace(',', '.');
    var n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  /**
   * Formatea un número a dos decimales. Siempre muestra 2 decimales aunque
   * sean ceros, por ejemplo "12.00". No aplica separación de miles ni
   * símbolo de moneda.
   */
  function fmt2(n){
    return (Math.round((n || 0) * 100) / 100).toFixed(2);
  }

  /**
   * Aplica el tema deseado. El tema puede ser 'dark', 'light' o 'system'.
   * Si se pasa 'system', se detecta automáticamente el esquema de color del
   * sistema operativo. Guarda la preferencia en localStorage para futuros
   * arranques y actualiza la etiqueta visible.
   */
  function applyTheme(theme){
    // Elimina cualquier atributo previo de tema.
    document.documentElement.removeAttribute('data-theme');
    var effective = theme;
    if(theme === 'system'){
      // Observa la preferencia del sistema operativo.
      var prefersDark = false;
      try{
        prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      }catch(e){}
      effective = prefersDark ? 'dark' : 'light';
    }
    if(effective === 'dark'){
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    // Persistir la preferencia en localStorage. Para 'system' guardamos
    // literalmente 'system' para no forzar un tema específico.
    try{ localStorage.setItem('rt_theme', theme); }catch(e){}
    // Actualiza la etiqueta del tema para informar al usuario.
    var lab = byId('themeLabel');
    if(lab){
      var text = '—';
      if(theme === 'system') text = 'Automático';
      else if(theme === 'dark') text = 'Oscuro';
      else text = 'Claro';
      lab.textContent = 'Tema: ' + text;
    }
  }

  /**
   * Inicializa el selector de tema leyendo la preferencia guardada y
   * configurando los botones de tema (oscuro, claro y automático).
   */
  function initTheme(){
    var pref = 'system';
    try{
      pref = localStorage.getItem('rt_theme') || 'system';
    }catch(e){}
    applyTheme(pref);
    // Asigna manejadores a los chips de tema.
    var dEl = byId('chipDark');
    if(dEl){ dEl.addEventListener('click', function(){ applyTheme('dark'); }); }
    var lEl = byId('chipLight');
    if(lEl){ lEl.addEventListener('click', function(){ applyTheme('light'); }); }
    var sEl = byId('chipSystem');
    if(sEl){ sEl.addEventListener('click', function(){ applyTheme('system'); }); }
  }

  /**
   * Inicializa el cálculo de precio medio por comensal. Escucha distintos
   * eventos sobre los campos de comensales y total para recalcular cuando
   * cambian los valores. Compatible con teclados táctiles y de escritorio.
   */
  function initAvgCalc(){
    var dinersEl = byId('diners');
    var totalEl  = byId('total');
    var outEl    = byId('avgPerDiner');
    if(!dinersEl || !totalEl || !outEl) return;
    function calc(){
      var diners = parseInt(dinersEl.value || '0', 10);
      var total  = parseNumber(totalEl.value || '0');
      if(diners > 0){
        var avg = total / diners;
        outEl.value = fmt2(avg) + ' €';
      } else {
        outEl.value = '—';
      }
    }
    // Eventos que recalculan el promedio. Se incluyen eventos táctiles
    // adicionales para mejorar la compatibilidad con iOS/Android.
    ['input','change','blur','keyup','keypress','mousedown','touchstart'].forEach(function(ev){
      dinersEl.addEventListener(ev, calc);
      totalEl.addEventListener(ev, calc);
    });
    // Ejecutar una vez al cargar para inicializar el campo.
    calc();
  }

  /**
   * Inicializa la valoración por estrellas. Maneja clics y toques sobre las
   * estrellas, actualiza el campo oculto y aplica la clase "filled" a las
   * estrellas seleccionadas. También gestiona el botón de limpiar valoración.
   */
  function initRating(){
    var starsEl = byId('rating');
    var hidden  = byId('ratingValue');
    if(!starsEl || !hidden) return;
    function paint(v){
      var buttons = starsEl.querySelectorAll('button[data-value]');
      for(var i = 0; i < buttons.length; i++){
        var val = parseInt(buttons[i].getAttribute('data-value'), 10);
        var on  = val <= v;
        buttons[i].classList.toggle('filled', on);
        buttons[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    }
    // Escucha clics y toques en todas las estrellas.
    ['click','touchstart','pointerdown','mousedown'].forEach(function(evt){
      starsEl.addEventListener(evt, function(e){
        var target = e.target;
        // Busca el botón más cercano con un data-value.
        if(target && target.closest){
          var btn = target.closest('button[data-value]');
          if(btn){
            var val = parseInt(btn.getAttribute('data-value'), 10) || 0;
            hidden.value = String(val);
            paint(val);
            e.preventDefault();
          }
        }
      }, {passive:false});
    });
    // Botón para limpiar la valoración (valor 0).
    var clearBtn = byId('ratingClear');
    if(clearBtn){
      ['click','touchstart','pointerdown','mousedown'].forEach(function(evt){
        clearBtn.addEventListener(evt, function(e){
          hidden.value = '0';
          paint(0);
          e.preventDefault();
        }, {passive:false});
      });
    }
    // Inicializa las estrellas a partir del valor existente.
    var initVal = parseInt(hidden.value || '0', 10) || 0;
    paint(initVal);
  }

  /**
   * Configura el botón de prueba para rellenar campos de ejemplo y mostrar
   * claramente cómo funcionan el cálculo y las estrellas. Al pulsarlo, se
   * insertan valores de prueba y se recalcula el promedio y la valoración.
   */
  function initSelfTest(){
    var btn = byId('selfTest');
    if(!btn) return;
    btn.addEventListener('click', function(){
      var dinersEl = byId('diners');
      var totalEl  = byId('total');
      var avgEl    = byId('avgPerDiner');
      var ratingHidden = byId('ratingValue');
      var starsEl = byId('rating');
      if(dinersEl) dinersEl.value = '4';
      if(totalEl) totalEl.value  = '100,50';
      // Recalcular el promedio forzando el evento 'input'.
      if(dinersEl){ dinersEl.dispatchEvent(new Event('input')); }
      if(totalEl){ totalEl.dispatchEvent(new Event('input')); }
      // Fijar rating a 4 y pintar las estrellas.
      if(ratingHidden){ ratingHidden.value = '4'; }
      if(starsEl){
        var buttons = starsEl.querySelectorAll('button[data-value]');
        for(var i = 0; i < buttons.length; i++){
          var val = parseInt(buttons[i].getAttribute('data-value'), 10);
          var on  = val <= 4;
          buttons[i].classList.toggle('filled', on);
          buttons[i].setAttribute('aria-pressed', on ? 'true' : 'false');
        }
      }
      // Mostrar mensaje informativo al usuario.
      alert('Prueba realizada: se han aplicado valores de ejemplo. Comprueba los campos.');
    });
  }

  /**
   * Persiste de forma muy sencilla el hecho de que un usuario ya se ha
   * registrado (o, al menos, ha pulsado el botón de inicio de sesión). La
   * aplicación original utiliza enlaces mágicos con Supabase, pero en esta
   * versión simplificada solo registramos un flag local. Si el usuario ya
   * se registró, deshabilitamos el control para que no tenga que hacerlo
   * nuevamente.
   */
  function initLoginPersistence(){
    try{
      var isReg = localStorage.getItem('rt_is_registered');
      var emailInput = byId('authEmail');
      var loginBtn   = byId('sendMagicLink');
      if(isReg && isReg === 'true'){
        // Deshabilita los controles y cambia el texto del botón.
        if(emailInput){
          emailInput.disabled = true;
          emailInput.value = localStorage.getItem('rt_registered_email') || emailInput.value;
        }
        if(loginBtn){
          loginBtn.disabled = true;
          loginBtn.textContent = 'Ya registrado';
        }
      }
      if(loginBtn){
        loginBtn.addEventListener('click', function(){
          // Evita que la aplicación se integre con Supabase. Solo marca el registro.
          var email = emailInput ? emailInput.value.trim() : '';
          if(!email){
            alert('Introduce tu email para registrarte');
            return;
          }
          try{
            localStorage.setItem('rt_is_registered', 'true');
            localStorage.setItem('rt_registered_email', email);
          }catch(e){}
          alert('Registro completado. A partir de ahora no necesitas iniciar sesión.');
          if(emailInput){ emailInput.disabled = true; }
          if(loginBtn){ loginBtn.disabled = true; loginBtn.textContent = 'Ya registrado'; }
        });
      }
    }catch(e){}
  }

  /**
   * Maneja el comportamiento de las pestañas (tabs). Permite cambiar entre
   * secciones de la aplicación ocultando el resto de paneles. Cada botón
   * con la clase `.tab` debe tener un atributo data-tab cuyo valor
   * coincide con el sufijo del id del panel correspondiente (`tab-<data-tab>`).
   */
  function initTabs(){
    var tabs = document.querySelectorAll('.tab');
    if(!tabs || !tabs.length) return;
    // Oculta o muestra los paneles según su estado activo por defecto.
    var panelsInit = document.querySelectorAll('.tabpanel');
    panelsInit.forEach(function(p){
      if(p.classList.contains('active')){
        p.style.display = '';
      } else {
        p.style.display = 'none';
      }
    });
    tabs.forEach(function(btn){
      btn.addEventListener('click', function(){
        // Quitar la clase activa de todos los tabs.
        tabs.forEach(function(t){ t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
        // Activar el tab seleccionado.
        btn.classList.add('active');
        btn.setAttribute('aria-selected','true');
        // Ocultar todos los paneles.
        var panels = document.querySelectorAll('.tabpanel');
        panels.forEach(function(p){
          p.classList.remove('active');
          // Oculta todos los paneles por defecto para asegurar que solo se muestre el activo.
          p.style.display = 'none';
        });
        // Mostrar el panel asociado.
        var tabName = btn.getAttribute('data-tab');
        var panel = document.getElementById('tab-' + tabName);
        if(panel){
          panel.classList.add('active');
          panel.style.display = '';
        }
      });
    });
  }

  // Ejecuta la inicialización cuando el DOM esté listo.
  document.addEventListener('DOMContentLoaded', function(){
    initTheme();
    initAvgCalc();
    initRating();
    initSelfTest();
    initLoginPersistence();
    initTabs();
    // Actualiza los indicadores de depuración manualmente.
    var jsStatus = byId('jsStatus');
    var miniDiag = byId('miniDiag');
    var stepDiag = byId('stepDiag');
    if(jsStatus){ jsStatus.textContent = 'JS OK'; }
    if(miniDiag){ miniDiag.textContent = 'Listo'; }
    if(stepDiag){ stepDiag.textContent = 'ready'; }
  });
})();