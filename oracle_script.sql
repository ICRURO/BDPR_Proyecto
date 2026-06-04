BEGIN EXECUTE IMMEDIATE 'DROP TABLE Cuentas_Usuarios PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TYPE Seg_Admin FORCE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TYPE Seg_Jugador FORCE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TYPE Seg_Base FORCE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

CREATE OR REPLACE TYPE Seg_Base AS OBJECT (
    ID_Usuario VARCHAR2(50),
    Contrasena VARCHAR2(100),
    Nickname VARCHAR2(100),
    Email VARCHAR2(150),
    Fecha_Registro DATE
) NOT FINAL;
/

CREATE OR REPLACE TYPE Seg_Jugador UNDER Seg_Base (
    Nivel INT
);
/

CREATE OR REPLACE TYPE Seg_Admin UNDER Seg_Base (
    Nivel_Privilegio INT,
    Departamento VARCHAR2(100)
);
/

CREATE TABLE Cuentas_Usuarios OF Seg_Base (
    CONSTRAINT pk_cuentas_usuarios PRIMARY KEY (ID_Usuario)
);
/

INSERT INTO Cuentas_Usuarios VALUES (Seg_Jugador('USR_1122', 'Pass123', 'Ian_Carlo', 'ian@uv.mx', SYSDATE, 45));
/
INSERT INTO Cuentas_Usuarios VALUES (Seg_Jugador('USR_4455', 'Gamer456', 'Fernando_ME', 'fernando@uv.mx', SYSDATE, 12));
/
INSERT INTO Cuentas_Usuarios VALUES (Seg_Admin('USR_9999', 'Admin2026', 'Tejeda_Admin', 'tejeda@uv.mx', SYSDATE, 5, 'Moderación'));
/

BEGIN EXECUTE IMMEDIATE 'DROP TABLE Catalogo_Videojuegos PURGE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TYPE Lista_Vdj_Precios'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TYPE Vdj_Precio'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TYPE Vdj_Objeto'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

CREATE OR REPLACE TYPE Vdj_Precio AS OBJECT (
    Precio NUMBER(8,2),
    URL_Compra VARCHAR2(255),
    Tienda VARCHAR2(100)
);
/

CREATE OR REPLACE TYPE Lista_Vdj_Precios AS TABLE OF Vdj_Precio;
/

CREATE OR REPLACE TYPE Vdj_Objeto AS OBJECT (
    ID_Juego VARCHAR2(50),
    Titulo VARCHAR2(150),
    Desarrolladora VARCHAR2(100),
    Genero VARCHAR2(100),
    Fecha_Lanzamiento DATE,
    Precios_Tiendas Lista_Vdj_Precios
);
/

CREATE TABLE Catalogo_Videojuegos OF Vdj_Objeto (
    CONSTRAINT pk_catalogo_videojuegos PRIMARY KEY (ID_Juego)
) NESTED TABLE Precios_Tiendas STORE AS nt_catalogo_precios;
/

INSERT INTO Catalogo_Videojuegos VALUES (Vdj_Objeto('GAME_ER2022', 'Elden Ring', 'FromSoftware', 'RPG', TO_DATE('2022-02-25','YYYY-MM-DD'), Lista_Vdj_Precios(Vdj_Precio(59.99, 'https://store.steampowered.com', 'Steam'), Vdj_Precio(69.99, 'https://store.playstation.com', 'PlayStation Store'))));
/
INSERT INTO Catalogo_Videojuegos VALUES (Vdj_Objeto('GAME_MET2024', 'Metaphor: ReFantazio', 'Atlus', 'RPG', TO_DATE('2024-10-11','YYYY-MM-DD'), Lista_Vdj_Precios(Vdj_Precio(69.99, 'https://store.steampowered.com', 'Steam'), Vdj_Precio(69.99, 'https://store.xbox.com', 'Xbox Live'))));
/
INSERT INTO Catalogo_Videojuegos VALUES (Vdj_Objeto('GAME_BG3', 'Baldur''s Gate 3', 'Larian Studios', 'RPG', TO_DATE('2023-08-03','YYYY-MM-DD'), Lista_Vdj_Precios(Vdj_Precio(59.99, 'https://store.steampowered.com', 'Steam'), Vdj_Precio(69.99, 'https://store.playstation.com', 'PlayStation Store'))));
/
INSERT INTO Catalogo_Videojuegos VALUES (Vdj_Objeto('GAME_CP2077', 'Cyberpunk 2077', 'CD Projekt Red', 'Sci-Fi RPG', TO_DATE('2020-12-10','YYYY-MM-DD'), Lista_Vdj_Precios(Vdj_Precio(59.99, 'https://store.steampowered.com', 'Steam'), Vdj_Precio(59.99, 'https://store.xbox.com', 'Xbox Live'))));
/
INSERT INTO Catalogo_Videojuegos VALUES (Vdj_Objeto('GAME_RE4R', 'Resident Evil 4 Remake', 'Capcom', 'Survival Horror', TO_DATE('2023-03-24','YYYY-MM-DD'), Lista_Vdj_Precios(Vdj_Precio(39.99, 'https://store.steampowered.com', 'Steam'), Vdj_Precio(59.99, 'https://store.playstation.com', 'PlayStation Store'))));
/
INSERT INTO Catalogo_Videojuegos VALUES (Vdj_Objeto('GAME_HADES2', 'Hades II', 'Supergiant Games', 'Roguelike', TO_DATE('2024-05-06','YYYY-MM-DD'), Lista_Vdj_Precios(Vdj_Precio(29.99, 'https://store.steampowered.com', 'Steam'))));
/
INSERT INTO Catalogo_Videojuegos VALUES (Vdj_Objeto('GAME_MHWILDS', 'Monster Hunter Wilds', 'Capcom', 'Action RPG', TO_DATE('2025-02-28','YYYY-MM-DD'), Lista_Vdj_Precios(Vdj_Precio(69.99, 'https://store.steampowered.com', 'Steam'), Vdj_Precio(69.99, 'https://store.playstation.com', 'PlayStation Store'), Vdj_Precio(69.99, 'https://store.xbox.com', 'Xbox Live'))));
/

COMMIT;
/