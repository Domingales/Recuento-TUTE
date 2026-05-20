
const STORAGE_KEY = 'marcador_tute_estado_v1';
const form = document.getElementById('formConfig');
const nombresContainer = document.getElementById('nombresContainer');
const marcadorDiv = document.getElementById('marcador');
const controlesPartida = document.getElementById('controlesPartida');
const btnNuevaPartida = document.getElementById('btnNuevaPartida');
const btnContinuarPartida = document.getElementById('btnContinuarPartida');
let jugadores = [];
let rondasPartida = 0;

// 🎵 Función para reproducir una melodía de 12 notas repetida 3 veces
function reproducirMelodia() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  // Escala alegre (C mayor con 12 notas, incluye octava superior)
  const notas = [
    261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88,
    523.25, 587.33, 659.25, 698.46, 783.99
  ];
  const duracion = 0.05; // duración por nota en segundos
  const repeticiones = 3;

  for (let r = 0; r < repeticiones; r++) {
    notas.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "triangle";
      const inicio = ctx.currentTime + (r * notas.length + i) * duracion;
      const fin = inicio + duracion;
      gain.gain.setValueAtTime(0.15, inicio);
      gain.gain.exponentialRampToValueAtTime(0.001, fin);
      osc.start(inicio);
      osc.stop(fin);
    });
  }
}


function guardarEstado(){
  if(!jugadores.length || !rondasPartida) return;
  const estado = {
    jugadores,
    rondas: rondasPartida,
    guardadoEn: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
}

function cargarEstado(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return null;
    const estado = JSON.parse(raw);
    if(!estado || !Array.isArray(estado.jugadores) || !Number.isFinite(Number(estado.rondas))) return null;
    if(estado.jugadores.length < 2 || estado.jugadores.length > 6) return null;
    return estado;
  }catch(err){
    console.warn('No se pudo cargar el estado guardado:', err);
    return null;
  }
}

function mostrarControlesPartida(){
  controlesPartida.style.display = jugadores.length ? 'grid' : 'none';
}

function restaurarPartidaGuardada(){
  const estado = cargarEstado();
  if(!estado) return;
  form.style.display = 'none';
  jugadores = estado.jugadores.map(j=>({
    nombre: String(j.nombre || ''),
    perdidas: Math.max(0, Number(j.perdidas) || 0),
    finalizado: Boolean(j.finalizado)
  })).filter(j=>j.nombre);
  rondasPartida = Number(estado.rondas) || 0;
  if(jugadores.length && rondasPartida){
    renderMarcador(rondasPartida);
    mostrarControlesPartida();
  }
}

btnNuevaPartida.addEventListener('click', ()=>{
  // Vuelve al flujo original de inicio: elegir nº de jugadores, nombres y rondas.
  localStorage.removeItem(STORAGE_KEY);
  jugadores = [];
  rondasPartida = 0;
  marcadorDiv.innerHTML = '';
  nombresContainer.innerHTML = '';
  form.reset();
  form.style.display = 'block';
  mostrarControlesPartida();
  document.getElementById('numJugadores').focus();
});

btnContinuarPartida.addEventListener('click', ()=>{
  if(!jugadores.length || !rondasPartida) return;
  guardarEstado();
});

window.addEventListener('beforeunload', guardarEstado);

document.getElementById('numJugadores').addEventListener('input', e=>{
  const n = parseInt(e.target.value)||0;
  nombresContainer.innerHTML='';
  for(let i=0;i<n;i++){
    const input = document.createElement('input');
    input.placeholder = 'Nombre del jugador '+(i+1);
    input.required = true;
    nombresContainer.appendChild(input);
  }
});

form.addEventListener('submit', e=>{
  e.preventDefault();
  const n = parseInt(document.getElementById('numJugadores').value);
  const rondas = parseInt(document.getElementById('numRondas').value);
  const nombres = [...nombresContainer.querySelectorAll('input')].map(i=>i.value.trim());
  if(nombres.length!==n || nombres.some(x=>!x)) return alert('Introduce todos los nombres');
  iniciarPartida(nombres,rondas);
});

function iniciarPartida(nombres,rondas){
  form.style.display='none';
  rondasPartida = rondas;
  jugadores = nombres.map(n=>({nombre:n,perdidas:0,finalizado:false}));
  renderMarcador(rondasPartida);
  mostrarControlesPartida();
  guardarEstado();
}

function renderMarcador(rondas){
  marcadorDiv.innerHTML='';
  jugadores.forEach((jugador,idx)=>{
    const div = document.createElement('div');
    div.className='jugador';
    div.innerHTML=`<span class="nombre">${jugador.nombre}</span>
                   <span class="perdidas">  : <span id="p-${idx}">${jugador.perdidas}</span></span>`;
    const cuadros = document.createElement('div');
    cuadros.className='cuadrados';
    for(let i=0;i<rondas;i++){
      const c = document.createElement('div');
      c.className='cuadro';
      if(jugador.perdidas >= rondas){
        c.classList.add('rojo');
      } else if(i < jugador.perdidas){
        c.classList.add('verde');
      }
      c.addEventListener('click',()=>alternarCuadro(idx,c,rondas));
      cuadros.appendChild(c);
    }
    div.appendChild(cuadros);
    marcadorDiv.appendChild(div);
  });
}

function alternarCuadro(idx,cuadro,maxRondas){
  const jugador = jugadores[idx];
  const cont = cuadro.parentElement;
  const cuadros = cont.querySelectorAll('.cuadro');
  const todosRojos = [...cuadros].every(c=>c.classList.contains('rojo'));

  // Caso de rectificación tras finalizar (todo rojo)
  if(todosRojos){
    jugador.perdidas = Math.max(0, jugador.perdidas - 1);
    cuadros.forEach(c=>c.classList.remove('rojo','verde'));
    for(let i=0;i<jugador.perdidas;i++) cuadros[i].classList.add('verde');
    jugador.finalizado = false;
    document.getElementById(`p-${idx}`).textContent = jugador.perdidas;
    guardarEstado();
    return;
  }

  // Conmutación normal
  if(cuadro.classList.contains('verde')){
    cuadro.classList.remove('verde');
    jugador.perdidas = Math.max(0, jugador.perdidas - 1);
  } else if(!cuadro.classList.contains('rojo')){
    cuadro.classList.add('verde');
    jugador.perdidas++;
  }

  document.getElementById(`p-${idx}`).textContent = jugador.perdidas;

  // Si alcanza el límite, pasar a ROJO (finalizado)
  if(jugador.perdidas >= maxRondas){
    cuadros.forEach(c=>{ c.classList.remove('verde'); c.classList.add('rojo'); });
    if(!jugador.finalizado){
      jugador.finalizado = true;
      reproducirMelodia(); // 🎶 Suena la melodía (12 notas × 3 ciclos)
    }
  } else {
    cuadros.forEach(c=>c.classList.remove('rojo'));
    jugador.finalizado = false;
  }
  guardarEstado();
}

restaurarPartidaGuardada();
