let usuarioSesion = null;
let juegoActivoId = null;

window.onload = obtenerCatalogoOracle;

async function obtenerCatalogoOracle() {
    try {
        const response = await fetch('/api/juegos');
        const juegos = await response.json();
        const grid = document.getElementById('lista-juegos-grid');
        grid.innerHTML = "";

        juegos.forEach(j => {
            grid.innerHTML += `
                <div class="game-box" onclick="abrirForoJuego('${j.ID_JUEGO}')">
                    <img src="img/${j.ID_JUEGO}.jpg" alt="${j.TITULO}" class="game-card-img" onerror="this.src='https://placehold.co/400x250/1e293b/fff?text=No+Image'">
                    <h3>${j.TITULO}</h3>
                    <span class="game-genre">${j.GENERO}</span>
                    <p class="game-dev">Desarrollado por: <strong>${j.DESARROLLADORA}</strong></p>
                </div>
            `;
        });
    } catch (e) { }
}

async function abrirForoJuego(idJuego) {
    juegoActivoId = idJuego;
    try {
        const response = await fetch(`/api/juego/${idJuego}`);
        const data = await response.json();
        document.getElementById('vista-catalogo').style.display = "none";
        document.getElementById('vista-foro').style.display = "block";
        document.getElementById('juego-portada-foro').src = `img/${idJuego}.jpg`;
        document.getElementById('juego-titulo').innerText = data.Titulo;
        document.getElementById('juego-estudio').innerText = data.Desarrolladora;
        document.getElementById('juego-genero').innerText = data.Genero;
        const listaPrecios = document.getElementById('precios-lista');
        listaPrecios.innerHTML = "";
        data.Precios_Tiendas.forEach(p => {
            listaPrecios.innerHTML += `
                <div class="price-item">
                    <span><strong>${p.Tienda}</strong></span>
                    <a href="${p.URL_Compra}" target="_blank" class="price-link">$${p.Precio} USD 🔗</a>
                </div>
            `;
        });
        const muro = document.getElementById('muro-social');
        muro.innerHTML = "";
        if(data.actividad_social.comentarios.length === 0) {
            muro.innerHTML = "<p class='muro-vacio'>Este foro no tiene comentarios. ¡Sé el primero!</p>";
        } else {
            data.actividad_social.comentarios.forEach(c => {
                muro.innerHTML += `
                    <div class="reseña-item">
                        <div class="reseña-meta">
                            <strong>@${c.nickname_autor} (${c.rol_autor})</strong>
                            <span>${c.fecha}</span>
                        </div>
                        <p class="reseña-text">${c.contenido}</p>
                        <span class="badge">${c.badge}</span>
                    </div>
                `;
            });
        }
    } catch (e) { }
}

function mostrarCatalogoPrincipal() {
    document.getElementById('vista-foro').style.display = "none";
    document.getElementById('vista-catalogo').style.display = "block";
    juegoActivoId = null;
    obtenerCatalogoOracle();
}

async function iniciarSesion() {
    const idInput = document.getElementById('login-id');
    const passInput = document.getElementById('login-pass');
    const errorMsg = document.getElementById('login-error-msg');   
    const nickInput = idInput.value.trim();
    const pass = passInput.value.trim();
    errorMsg.style.display = "none";
    errorMsg.innerText = "";
    idInput.style.borderColor = "";
    passInput.style.borderColor = "";
    if(!nickInput || !pass) {
        errorMsg.innerText = "Ingresa tu Usuario y Contraseña.";
        errorMsg.style.display = "block";
        if(!nickInput) idInput.style.borderColor = "#f43f5e";
        if(!pass) passInput.style.borderColor = "#f43f5e";
        return;
    }
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: nickInput, contrasena: pass })
        });
        const data = await response.json();
        
        if(!response.ok) {
            idInput.style.borderColor = "#f43f5e";
            passInput.style.borderColor = "#f43f5e";
            errorMsg.innerText = `${data.error}`;
            errorMsg.style.display = "block";
            return;
        }

        usuarioSesion = data;
        document.getElementById('auth-status').innerHTML = `<span class="auth-status-active">@${data.nickname}</span>`;
        document.getElementById('auth-forms').innerHTML = `<button onclick="window.location.reload()" class="btn-red">Salir</button>`;
        const input = document.getElementById('foro-autor-id');
        input.value = data.nickname;
        input.disabled = true; 
        const txtContenido = document.getElementById('foro-contenido');
        const btnPublicar = document.getElementById('btn-publicar');
        txtContenido.disabled = false;
        txtContenido.placeholder = "Escribe tu opinión aquí...";
        btnPublicar.disabled = false;
        btnPublicar.style.backgroundColor = "#10b981";
        btnPublicar.style.cursor = "pointer";
    } catch (e) { 
        errorMsg.innerText = "Error de enlace con Oracle Cloud.";
        errorMsg.style.display = "block";
    }
}

async function registrarUsuario() {
    const id = document.getElementById('reg-id').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    const nick = document.getElementById('reg-nick').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const regStatus = document.getElementById('reg-status-msg');
    regStatus.className = "error-highlight"; 
    regStatus.style.display = "none";
    regStatus.innerText = "";
    if(!id || !pass || !nick || !email) {
        regStatus.innerText = "Rellena todos los campos.";
        regStatus.style.display = "block";
        return;
    }
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_usuario: id, contrasena: pass, nickname: nick, email: email })
        });
        const data = await response.json();
        if(!response.ok) {
            regStatus.innerText = `${data.error}`;
            regStatus.style.display = "block";
            return;
        }
        regStatus.className = "success-highlight";
        regStatus.innerText = "¡Cuenta registrada!";
        regStatus.style.display = "block";
        document.getElementById('login-id').value = nick;
        document.getElementById('login-pass').value = pass;
    } catch (error) { 
        regStatus.innerText = "Error de conexión al registrar.";
        regStatus.style.display = "block";
    }
}

async function publicarReseña() {
    const foroStatus = document.getElementById('foro-status-msg');
    foroStatus.className = "error-highlight";
    foroStatus.style.display = "none";
    foroStatus.innerText = "";
    const nickAutor = document.getElementById('foro-autor-id').value.trim();
    const texto = document.getElementById('foro-contenido').value.trim();
    if(!texto) {
        foroStatus.innerText = "Ingresa texto antes de publicar.";
        foroStatus.style.display = "block";
        return;
    }

    try {
        const response = await fetch('/api/juego/resena', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname_autor: nickAutor, id_juego: juegoActivoId, contenido: texto })
        });
        const data = await response.json();
        if(!response.ok) {
            foroStatus.innerText = `${data.error}`;
            foroStatus.style.display = "block";
            return;
        }

        document.getElementById('foro-contenido').value = "";
        foroStatus.className = "success-highlight";
        foroStatus.innerText = "¡Publicado exitosamente!";
        foroStatus.style.display = "block";

        setTimeout(() => {
            abrirForoJuego(juegoActivoId);
        }, 1000);
    } catch (e) { 
        foroStatus.innerText = "Error al cargar datos en MongoDB.";
        foroStatus.style.display = "block";
    }
}