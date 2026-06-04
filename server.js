const express = require('express');
const { MongoClient } = require('mongodb'); 
const oracledb = require('oracledb'); 
const multer = require('multer');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

const almacenamientoImagenes = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/img/');
    },
    filename: (req, file, cb) => {
        const idJuego = req.body.id_juego || 'TEMP_IMAGE';
        cb(null, `${idJuego}.jpg`);
    }
});
const upload = multer({ storage: almacenamientoImagenes });
const mongoURI = "mongodb://usuario_proyecto_foro:Passwd123@localhost:27017/comunidad_gamer?authSource=comunidad_gamer";
const mongoClient = new MongoClient(mongoURI);
let dbMongo;
const oracleConfig = {
    user: "user30", 
    password: "ListiBDPRu30", 
    connectString: "(description= (retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1521)(host=adb.us-phoenix-1.oraclecloud.com))(connect_data=(service_name=gf97f8355b83e0a_listibdpror2026_tp.adb.oraclecloud.com))(security=(ssl_server_dn_match=yes)))"
};

async function inicializarMotores() {
    try {
        await mongoClient.connect();
        dbMongo = mongoClient.db('comunidad_gamer');
        await oracledb.createPool(oracleConfig);
        app.listen(PORT, () => {
            console.log(`Picale aqui http://localhost:${PORT}`);
        });
    } catch (error) {
        process.exit(1);
    }
}

inicializarMotores();

async function verificarPermisoAdmin(connection, nickname) {
    if (!nickname) return false;
    const query = `
        SELECT u.Rol FROM Cuentas_Usuarios u WHERE LOWER(u.Nickname) = LOWER(:nickname)
    `;
    const result = await connection.execute(query, [nickname], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows.length > 0 && result.rows[0].ROL === 'ADMINISTRADOR';
}

app.post('/api/auth/login', async (req, res) => {
    const { nickname, contrasena } = req.body;
    let connectionOracle;
    try {
        connectionOracle = await oracledb.getConnection();
        const query = `
            SELECT u.ID_Usuario, u.Contrasena, u.Nickname, u.Email, u.Rol,
                   TREAT(VALUE(u) AS Seg_Jugador).Nivel AS Nivel,
                   TREAT(VALUE(u) AS Seg_Admin).Departamento AS Departamento
            FROM Cuentas_Usuarios u 
            WHERE LOWER(u.Nickname) = LOWER(:nickname)
        `;
        const result = await connectionOracle.execute(query, [nickname], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "El Usuario o la Contraseña no está registrado." });
        }
        const usuario = result.rows[0];
        if (usuario.CONTRASENA !== contrasena) {
            return res.status(401).json({ error: "Contraseña incorrecta. Inténtalo de nuevo" });
        }
        res.json({
            id: usuario.ID_USUARIO,
            nickname: usuario.NICKNAME,
            email: usuario.EMAIL,
            rol: usuario.ROL, 
            nivel: usuario.NIVEL || null,
            departamento: usuario.DEPARTAMENTO || null
        });
    } catch (error) {
        res.status(500).json({ error: "Error" });
    } finally {
        if (connectionOracle) await connectionOracle.close();
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { contrasena, nickname, email } = req.body;
    let connectionOracle;
    try {
        connectionOracle = await oracledb.getConnection();
        const query = `
            INSERT INTO Cuentas_Usuarios VALUES (
                Seg_Jugador('USR_' || seq_usuarios.NEXTVAL, :contrasena, :nickname, :email, SYSDATE, 'JUGADOR', 1)
            )
        `;
        await connectionOracle.execute(query, { contrasena, nickname, email }, { autoCommit: true }); 
        res.status(201).json({ mensaje: "Usuario registrado con éxito." });
    } catch (error) {
        if (error.message.includes("ORA-00001")) {
            return res.status(400).json({ error: "Nombre de usuario ya utilizado." });
        }
        res.status(500).json({ error: "Error al registrar." });
    } finally {
        if (connectionOracle) await connectionOracle.close();
    }
});

app.post('/api/juego/nuevo', upload.single('portada_archivo'), async (req, res) => {
    const { id_juego, titulo, desarrolladora, genero, fecha, precio, tienda, url_compra, operador_nickname } = req.body;
    let connectionOracle;
    try {
        connectionOracle = await oracledb.getConnection();
        const esAdmin = await verificarPermisoAdmin(connectionOracle, operador_nickname);
        if (!esAdmin) {
            return res.status(403).json({ error: "Se requieren permisos de Administrador" });
        }
        const query = `
            INSERT INTO Catalogo_Videojuegos VALUES (
                Vdj_Objeto(:id, :titulo, :desarrolladora, :genero, TO_DATE(:fecha, 'YYYY-MM-DD'), 
                Lista_Vdj_Precios(Vdj_Precio(:precio, :url, :tienda)))
            )
        `;
        await connectionOracle.execute(query, {
            id: id_juego, titulo, desarrolladora, genero, fecha, 
            precio: parseFloat(precio), url: url_compra, tienda
        }, { autoCommit: true });
        res.status(201).json({ mensaje: "Videojuego añadido" });
    } catch (error) {
        res.status(500).json({ error: "Error al añadir el videojuego" });
    } finally {
        if (connectionOracle) await connectionOracle.close();
    }
});

app.put('/api/juego/editar', upload.single('portada_archivo'), async (req, res) => {
    const { id_juego, titulo, desarrolladora, genero, fecha, precio, tienda, url_compra, operador_nickname } = req.body;
    let connectionOracle;
    try {
        connectionOracle = await oracledb.getConnection();
        const esAdmin = await verificarPermisoAdmin(connectionOracle, operador_nickname);
        if (!esAdmin) {
            return res.status(403).json({ error: "Se requieren permisos de Administrador" });
        }
        const query = `
            UPDATE Catalogo_Videojuegos v
            SET v.Titulo = :titulo,
                v.Desarrolladora = :desarrolladora,
                v.Genero = :genero,
                v.Fecha_Lanzamiento = TO_DATE(:fecha, 'YYYY-MM-DD'),
                v.Precios_Tiendas = Lista_Vdj_Precios(Vdj_Precio(:precio, :url, :tienda))
            WHERE v.ID_Juego = :id
        `;
        const result = await connectionOracle.execute(query, {
            titulo, desarrolladora, genero, fecha,
            precio: parseFloat(precio), url: url_compra, tienda, id: id_juego
        }, { autoCommit: true });
        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: "El videojuego no existe." });
        }
        res.json({ mensaje: "Videojuego modificado" });
    } catch (error) {
        res.status(500).json({ error: "Error" });
    } finally {
        if (connectionOracle) await connectionOracle.close();
    }
});

app.delete('/api/juego/eliminar', async (req, res) => {
    const { id_juego, operador_nickname } = req.body;
    let connectionOracle;
    try {
        connectionOracle = await oracledb.getConnection();
        const esAdmin = await verificarPermisoAdmin(connectionOracle, operador_nickname);
        if (!esAdmin) {
            return res.status(403).json({ error: "Se requieren permisos de Administrador." });
        }
        const queryOracle = `DELETE FROM Catalogo_Videojuegos WHERE ID_Juego = :id`;
        const result = await connectionOracle.execute(queryOracle, { id: id_juego }, { autoCommit: true });
        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: "El videojuego no existe en el catálogo" });
        }
        await dbMongo.collection('publicaciones').deleteMany({ id_juego: id_juego });
        res.json({ mensaje: "Videojuego eliminados correctamente." });
    } catch (error) {
        res.status(500).json({ error: "Error interno al eliminar el videojuego" });
    } finally {
        if (connectionOracle) await connectionOracle.close();
    }
});

app.get('/api/juegos', async (req, res) => {
    let connectionOracle;
    try {
        connectionOracle = await oracledb.getConnection();
        const query = `SELECT ID_Juego, Titulo, Desarrolladora, Genero FROM Catalogo_Videojuegos ORDER BY Titulo ASC`;
        const result = await connectionOracle.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: "Error al cargar el catálogo" });
    } finally {
        if (connectionOracle) await connectionOracle.close();
    }
});

app.get('/api/juego/:id', async (req, res) => {
    const idJuego = req.params.id;
    let connectionOracle;
    try {
        connectionOracle = await oracledb.getConnection();
        const queryOracle = `
            SELECT v.Titulo, v.Desarrolladora, v.Genero, TO_CHAR(v.Fecha_Lanzamiento, 'YYYY-MM-DD') AS FECHA, 
                   p.Tienda, p.Precio, p.URL_Compra 
            FROM Catalogo_Videojuegos v, TABLE(v.Precios_Tiendas) p 
            WHERE v.ID_Juego = :id
        `;
        const resultOracle = await connectionOracle.execute(queryOracle, [idJuego], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        if (resultOracle.rows.length === 0) {
            return res.status(404).json({ error: "Videojuego no encontrado" });
        }
        const primerRegistro = resultOracle.rows[0];
        const juegoEstructurado = {
            ID_Juego: idJuego,
            Titulo: primerRegistro.TITULO,
            Desarrolladora: primerRegistro.DESARROLLADORA,
            Genero: primerRegistro.GENERO,
            Fecha_Lanzamiento: primerRegistro.FECHA,
            Precios_Tiendas: resultOracle.rows.map(r => ({
                Tienda: r.TIENDA,
                Precio: r.PRECIO,
                URL_Compra: r.URL_COMPRA
            }))
        };
        const resenasReales = await dbMongo.collection('publicaciones')
            .find({ id_juego: idJuego })
            .sort({ fecha: -1 }) 
            .toArray();
        res.json({
            ...juegoEstructurado,
            actividad_social: { comentarios: resenasReales }
        });
    } catch (error) {
        res.status(500).json({ error: "Error" });
    } finally {
        if (connectionOracle) await connectionOracle.close();
    }
});

app.post('/api/juego/resena', async (req, res) => {
    const { nickname_autor, id_juego, contenido } = req.body;   
    let connectionOracle;
    try {
        connectionOracle = await oracledb.getConnection();
        const query = `
            SELECT u.ID_Usuario, u.Nickname, u.Rol,
                   TREAT(VALUE(u) AS Seg_Jugador).Nivel AS Nivel,
                   TREAT(VALUE(u) AS Seg_Admin).Departamento AS Departamento
            FROM Cuentas_Usuarios u WHERE LOWER(u.Nickname) = LOWER(:nickname)
        `;
        const result = await connectionOracle.execute(query, [nickname_autor], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        if (result.rows.length === 0) {
            return res.status(400).json({ error: "Error" });
        }
        const datosUser = result.rows[0];
        let badgeTexto = datosUser.ROL === "ADMINISTRADOR" ? `Staff [${datosUser.DEPARTAMENTO}]` : `Nivel ${datosUser.NIVEL} - Gamer`;
        const nuevaPublicacion = {
            id_autor: datosUser.ID_USUARIO, 
            nickname_autor: datosUser.NICKNAME, 
            rol_autor: datosUser.ROL,
            id_juego: id_juego, 
            badge: badgeTexto, 
            contenido: contenido,
            fecha: new Date().toISOString().split('T')[0], 
            comentarios: [], 
            reacciones: []   
        };
        await dbMongo.collection('publicaciones').insertOne(nuevaPublicacion);
        res.status(201).json({ mensaje: "..." });
    } catch (error) {
        res.status(500).json({ error: "Error al procesar la reseña" });
    } finally {
        if (connectionOracle) await connectionOracle.close();
    }
});