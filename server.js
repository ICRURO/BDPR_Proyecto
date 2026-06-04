const express = require('express');
const { MongoClient } = require('mongodb'); 
const oracledb = require('oracledb'); 
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

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
        });
    } catch (error) {
        process.exit(1);
    }
}

inicializarMotores();

app.post('/api/auth/login', async (req, res) => {
    const { nickname, contrasena } = req.body;
    let connectionOracle;
    try {
        connectionOracle = await oracledb.getConnection();
        const query = `
            SELECT u.ID_Usuario, u.Contrasena, u.Nickname, u.Email, 
                   TREAT(VALUE(u) AS Seg_Jugador).Nivel AS Nivel,
                   TREAT(VALUE(u) AS Seg_Admin).Departamento AS Departamento
            FROM Cuentas_Usuarios u 
            WHERE LOWER(u.Nickname) = LOWER(:nickname)
        `;
        const result = await connectionOracle.execute(query, [nickname], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "El Nickname proporcionado no está registrado." });
        }
        const usuario = result.rows[0];

        if (usuario.CONTRASENA !== contrasena) {
            return res.status(401).json({ error: "Contraseña incorrecta. Inténtalo de nuevo." });
        }
        let rolFinal = usuario.DEPARTAMENTO ? "Administrador" : "Jugador";
        res.json({
            id: usuario.ID_USUARIO,
            nickname: usuario.NICKNAME,
            email: usuario.EMAIL,
            rol: rolFinal,
            nivel: usuario.NIVEL || null,
            departamento: usuario.DEPARTAMENTO || null
        });
    } catch (error) {
        res.status(500).json({ error: "Error interno en el servidor de seguridad de Oracle." });
    } finally {
        if (connectionOracle) await connectionOracle.close();
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { id_usuario, contrasena, nickname, email } = req.body;
    let connectionOracle;
    try {
        connectionOracle = await oracledb.getConnection();
        const query = `
            INSERT INTO Cuentas_Usuarios VALUES (
                Seg_Jugador(:id, :contrasena, :nickname, :email, SYSDATE, 1)
            )
        `;
        await connectionOracle.execute(query, { 
            id: id_usuario, 
            contrasena: contrasena, 
            nickname: nickname, 
            email: email 
        }, { autoCommit: true }); 
    } catch (error) {
        if (error.message.includes("ORA-00001")) {
            return res.status(400).json({ error: "Ese ID o Nickname ya pertenece a otro usuario registrado." });
        }
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
        res.status(500).json({ error: "Error al cargar el catálogo." });
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
            SELECT v.Titulo, v.Desarrolladora, v.Genero, p.Tienda, p.Precio, p.URL_Compra 
            FROM Catalogo_Videojuegos v, TABLE(v.Precios_Tiendas) p 
            WHERE v.ID_Juego = :id
        `;
        const resultOracle = await connectionOracle.execute(queryOracle, [idJuego], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        if (resultOracle.rows.length === 0) {
            return res.status(404).json({ error: "Videojuego no encontrado." });
        }
        const primerRegistro = resultOracle.rows[0];
        const juegoEstructurado = {
            ID_Juego: idJuego,
            Titulo: primerRegistro.TITULO,
            Desarrolladora: primerRegistro.DESARROLLADORA,
            Genero: primerRegistro.GENERO,
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
            SELECT u.ID_Usuario, u.Nickname, 
                   TREAT(VALUE(u) AS Seg_Jugador).Nivel AS Nivel,
                   TREAT(VALUE(u) AS Seg_Admin).Departamento AS Departamento
            FROM Cuentas_Usuarios u WHERE LOWER(u.Nickname) = LOWER(:nickname)
        `;
        const result = await connectionOracle.execute(query, [nickname_autor], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        if (result.rows.length === 0) {
            return res.status(400).json({ error: "Publicación rechazada: Tu Nickname no es válido en Oracle Cloud." });
        }
        const datosUser = result.rows[0];
        let rolFinal = datosUser.DEPARTAMENTO ? "Administrador" : "Jugador";
        let badgeTexto = datosUser.DEPARTAMENTO ? `Staff [${datosUser.DEPARTAMENTO}]` : `Nivel ${datosUser.NIVEL} - Gamer`;
        const nuevaPublicacion = {
            id_autor: datosUser.ID_USUARIO, 
            nickname_autor: datosUser.NICKNAME, 
            rol_autor: rolFinal,
            id_juego: id_juego, 
            badge: badgeTexto, 
            contenido: contenido,
            fecha: new Date().toISOString().split('T')[0], 
            comentarios: [], 
            reacciones: []   
        };
        await dbMongo.collection('publicaciones').insertOne(nuevaPublicacion);
        res.status(201).json({ mensaje: "Publicado con éxito." });
    } catch (error) {
        res.status(500).json({ error: "Error al procesar la reseña." });
    } finally {
        if (connectionOracle) await connectionOracle.close();
    }
});