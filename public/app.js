let usuarioSesion = null;
let juegoActivoId = null;
let infoJuegoActivo = null;
let juegosMemoriaLocal = []; 

window.onload = obtenerCatalogoOracle;

async function obtenerCatalogoOracle() {
    try {
        const response = await fetch('/api/juegos');
        const juegos = await response.json();
        juegosMemoriaLocal = juegos; 
        document.getElementById('buscar-juego').value = "";
        renderizarJuegosEnPantalla(juegosMemoriaLocal);
    } catch (e) { }
}

function renderizarJuegosEnPantalla(listaJuegos) {
    const grid = document.getElementById('lista-juegos-grid');
    grid.innerHTML = "";
    if (listaJuegos.length === 0) {
        grid.innerHTML = "<p class='muro-vacio' style='grid-column: 1/-1; text-align: center;'>No se encontró lo que buscabas.</p>";
        return;
    }
    listaJuegos.forEach(j => {
        grid.innerHTML += `
            <div class="game-box" onclick="abrirForoJuego('${j.ID_JUEGO}')">
                <img src="img/${j.ID_JUEGO}.jpg?t=${new Date().getTime()}" alt="${j.TITULO}" class="game-card-img" onerror="this.src='https://placehold.co/400x250/1e293b/fff?text=No+Image'">
                <h3>${j.TITULO}</h3>
                <span class="game-genre">${j.GENERO}</span>
                <p class="game-dev">Desarrollado por: <strong>${j.DESARROLLADORA}</strong></p>
            </div>
        `;
    });
}

function filtrarCatalogo() {
    const textoBusqueda = document.getElementById('buscar-juego').value.toLowerCase().trim();
    const juegosFiltrados = juegosMemoriaLocal.filter(juego => {
        const tituloMatch = juego.TITULO ? juego.TITULO.toLowerCase().includes(textoBusqueda) : false;
        const generoMatch = juego.GENERO ? juego.GENERO.toLowerCase().includes(textoBusqueda) : false;
        return tituloMatch || generoMatch;
    });
    renderizarJuegosEnPantalla(juegosFiltrados);
}

async function abrirForoJuego(idJuego) {
    juegoActivoId = idJuego;
    try {
        const response = await fetch(`/api/juego/${idJuego}`);
        const data = await response.json();
        infoJuegoActivo = data; 
        document.getElementById('vista-catalogo').style.display = "none";
        document.getElementById('vista-agregar-juego').style.display = "none";
        document.getElementById('vista-editar-juego').style.display = "none";
        document.getElementById('vista-foro').style.display = "block";
        if (usuarioSesion && usuarioSesion.rol === "ADMINISTRADOR") {
            document.getElementById('btn-editar-juego').style.display = "inline-block";
            document.getElementById('btn-eliminar-juego').style.display = "inline-block";
        } else {
            document.getElementById('btn-editar-juego').style.display = "none";
            document.getElementById('btn-eliminar-juego').style.display = "none";
        }
        document.getElementById('juego-portada-foro').src = `img/${idJuego}.jpg?t=${new Date().getTime()}`;
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
            muro.innerHTML = "<p class='muro-vacio'>Este foro está vacío. Se el primero en comentar</p>";
        } else {
            data.actividad_social.comentarios.forEach(c => {
                // Se eliminó la etiqueta <span class="badge"> que pintaba el badge de Oracle
                muro.innerHTML += `
                    <div class="reseña-item">
                        <div class="reseña-meta">
                            <strong>@${c.nickname_autor} (${c.rol_autor})</strong>
                            <span>${c.fecha}</span>
                        </div>
                        <p class="reseña-text">${c.contenido}</p>
                    </div>
                `;
            });
        }
    } catch (e) { }
}

function mostrarCatalogoPrincipal() {
    document.getElementById('vista-foro').style.display = "none";
    document.getElementById('vista-agregar-juego').style.display = "none";
    document.getElementById('vista-editar-juego').style.display = "none";
    document.getElementById('vista-catalogo').style.display = "block";
    juegoActivoId = null;
    infoJuegoActivo = null;
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
        if (usuarioSesion.rol === "ADMINISTRADOR") {
            document.getElementById('btn-abrir-add-juego').style.display = "block";
        }
        const input = document.getElementById('foro-autor-id');
        input.value = data.nickname;
        input.disabled = true; 
        const txtContenido = document.getElementById('foro-contenido');
        const btnPublicar = document.getElementById('btn-publicar');
        txtContenido.disabled = false;
        txtContenido.placeholder = "Escribe tu reseña aquí";
        btnPublicar.disabled = false;
        btnPublicar.style.backgroundColor = "#10b981";
        btnPublicar.style.cursor = "pointer";
    } catch (e) { 
        errorMsg.innerText = "Error de enlace con Oracle Cloud.";
        errorMsg.style.display = "block";
    }
}

async function registrarUsuario() {
    const pass = document.getElementById('reg-pass').value.trim();
    const nick = document.getElementById('reg-nick').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const regStatus = document.getElementById('reg-status-msg');
    regStatus.className = "error-highlight"; 
    regStatus.style.display = "none";
    regStatus.innerText = "";
    if(!pass || !nick || !email) {
        regStatus.innerText = "Rellena todos los campos.";
        regStatus.style.display = "block";
        return;
    }
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contrasena: pass, nickname: nick, email: email })
        });
        const data = await response.json();
        if(!response.ok) {
            regStatus.innerText = `${data.error}`;
            regStatus.style.display = "block";
            return;
        }
        regStatus.className = "success-highlight";
        regStatus.innerText = "Cuenta registrada";
        regStatus.style.display = "block";
        document.getElementById('login-id').value = nick;
        document.getElementById('login-pass').value = pass;
    } catch (error) { 
        regStatus.innerText = "Error de conexión al registrar";
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
        foroStatus.innerText = "Ingresa texto antes de publicar";
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
        foroStatus.innerText = "Publicado exitosamente";
        foroStatus.style.display = "block";
        setTimeout(() => {
            abrirForoJuego(juegoActivoId);
            foroStatus.style.display = "none";
        }, 1000);
    } catch (e) { 
        foroStatus.innerText = "Error al cargar datos";
        foroStatus.style.display = "block";
    }
}

function mostrarAgregarJuego() {
    document.getElementById('vista-catalogo').style.display = "none";
    document.getElementById('vista-foro').style.display = "none";
    document.getElementById('vista-editar-juego').style.display = "none";
    document.getElementById('vista-agregar-juego').style.display = "block";
}

async function enviarNuevoJuego() {
    const id = document.getElementById('nuevo-id').value.trim();
    const titulo = document.getElementById('nuevo-titulo').value.trim();
    const desarrolladora = document.getElementById('nuevo-desarrolladora').value.trim();
    const genero = document.getElementById('nuevo-genero').value.trim();
    const fecha = document.getElementById('nuevo-fecha').value;
    const precio = document.getElementById('nuevo-precio').value;
    const tienda = document.getElementById('nuevo-tienda').value.trim();
    const url = document.getElementById('nuevo-url').value.trim();
    const fileInput = document.getElementById('nuevo-portada');
    const statusMsg = document.getElementById('nuevo-status-msg');
    statusMsg.className = "error-highlight";
    if(!id || !titulo || !desarrolladora || !genero || !fecha || !precio || !tienda || !url || fileInput.files.length === 0) {
        statusMsg.innerText = "Por favor, completa todos los campos e incluye una imagen.";
        statusMsg.style.display = "block";
        return;
    }
    const formData = new FormData();
    formData.append('id_juego', id);
    formData.append('titulo', titulo);
    formData.append('desarrolladora', desarrolladora);
    formData.append('genero', genero);
    formData.append('fecha', fecha);
    formData.append('precio', precio);
    formData.append('tienda', tienda);
    formData.append('url_compra', url);
    formData.append('operador_nickname', usuarioSesion ? usuarioSesion.nickname : '');
    formData.append('portada_archivo', fileInput.files[0]);
    try {
        const response = await fetch('/api/juego/nuevo', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if(!response.ok) {
            statusMsg.innerText = data.error;
            statusMsg.style.display = "block";
            return;
        }
        statusMsg.className = "success-highlight";
        statusMsg.innerText = "Juego añadido exitosamente";
        statusMsg.style.display = "block";
        document.querySelectorAll('#vista-agregar-juego input').forEach(input => input.value = '');
        setTimeout(() => {
            mostrarCatalogoPrincipal();
            statusMsg.style.display = "none";
        }, 1500);
    } catch (e) {
        statusMsg.innerText = "Error de conexión";
        statusMsg.style.display = "block";
    }
}

function cargarFormularioEdicion() {
    if (!infoJuegoActivo) return;
    document.getElementById('vista-foro').style.display = "none";
    document.getElementById('vista-editar-juego').style.display = "block";
    document.getElementById('edit-titulo').value = infoJuegoActivo.Titulo;
    document.getElementById('edit-desarrolladora').value = infoJuegoActivo.Desarrolladora;
    document.getElementById('edit-genero').value = infoJuegoActivo.Genero;
    document.getElementById('edit-fecha').value = infoJuegoActivo.Fecha_Lanzamiento || "";
    document.getElementById('edit-portada').value = ""; 
    if(infoJuegoActivo.Precios_Tiendas && infoJuegoActivo.Precios_Tiendas.length > 0) {
        document.getElementById('edit-precio').value = infoJuegoActivo.Precios_Tiendas[0].Precio;
        document.getElementById('edit-tienda').value = infoJuegoActivo.Precios_Tiendas[0].Tienda;
        document.getElementById('edit-url').value = infoJuegoActivo.Precios_Tiendas[0].URL_Compra;
    } else {
        document.getElementById('edit-precio').value = "";
        document.getElementById('edit-tienda').value = "";
        document.getElementById('edit-url').value = "";
    }
}

async function enviarEdicionJuego() {
    const titulo = document.getElementById('edit-titulo').value.trim();
    const desarrolladora = document.getElementById('edit-desarrolladora').value.trim();
    const genero = document.getElementById('edit-genero').value.trim();
    const fecha = document.getElementById('edit-fecha').value;
    const precio = document.getElementById('edit-precio').value;
    const tienda = document.getElementById('edit-tienda').value.trim();
    const url = document.getElementById('edit-url').value.trim();
    const fileInput = document.getElementById('edit-portada');
    const statusMsg = document.getElementById('edit-status-msg');
    statusMsg.className = "error-highlight";
    if(!titulo || !desarrolladora || !genero || !fecha || !precio || !tienda || !url) {
        statusMsg.innerText = "Todos los campos son obligatorios para actualizar el catálogo.";
        statusMsg.style.display = "block";
        return;
    }
    const formData = new FormData();
    formData.append('id_juego', juegoActivoId);
    formData.append('titulo', titulo);
    formData.append('desarrolladora', desarrolladora);
    formData.append('genero', genero);
    formData.append('fecha', fecha);
    formData.append('precio', precio);
    formData.append('tienda', tienda);
    formData.append('url_compra', url);
    formData.append('operador_nickname', usuarioSesion ? usuarioSesion.nickname : '');
    if (fileInput.files.length > 0) {
        formData.append('portada_archivo', fileInput.files[0]);
    }
    try {
        const response = await fetch('/api/juego/editar', {
            method: 'PUT',
            body: formData
        });
        const data = await response.json();
        if(!response.ok) {
            statusMsg.innerText = data.error;
            statusMsg.style.display = "block";
            return;
        }

        statusMsg.className = "success-highlight";
        statusMsg.innerText = "¡Catálogo y portada actualizados correctamente!";
        statusMsg.style.display = "block";
        setTimeout(() => {
            abrirForoJuego(juegoActivoId);
            statusMsg.style.display = "none";
        }, 1000);
    } catch (e) {
        statusMsg.innerText = "Error al conectar con el servidor.";
        statusMsg.style.display = "block";
    }
}

async function eliminarJuegoCatalogo() {
    if (!juegoActivoId) return;
    try {
        const response = await fetch('/api/juego/eliminar', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_juego: juegoActivoId,
                operador_nickname: usuarioSesion ? usuarioSesion.nickname : ''
            })
        });
        const data = await response.json();
        if(!response.ok) {
            return;
        }
        mostrarCatalogoPrincipal();
    } catch(e) {
    }
}