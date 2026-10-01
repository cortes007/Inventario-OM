-- Carga inicial del inventario de AcabadosOM SAS (ejecutar DESPUÉS de schema.sql)
insert into public.herramientas (nombre, categoria, ubicacion, stock_minimo, estado) values
 ('Equipo de altura',               'Seguridad',       'Bodega', 0, 'EN_REPARACION'),
 ('Destornillador',                 'Herramienta manual','Bodega', 1, 'DISPONIBLE'),
 ('Casco de construcción',          'Seguridad',       'Bodega', 2, 'DISPONIBLE'),
 ('Radio con cargador onda larga',  'Comunicación',    'Bodega', 2, 'DISPONIBLE'),
 ('Cortador de cerámica',           'Corte',           'Bodega', 1, 'DISPONIBLE'),
 ('Motor de concretador',           'Maquinaria',      'Bodega', 0, 'EN_REPARACION'),
 ('Cizalla',                        'Corte',           'Bodega', 0, 'DISPONIBLE'),
 ('Repuestos varios',               'Repuestos',       'Bodega', 0, 'DISPONIBLE'),
 ('Escuadra',                       'Medición',        'Bodega', 0, 'DISPONIBLE'),
 ('Mango de sierra',                'Repuestos',       'Bodega', 0, 'DISPONIBLE'),
 ('Nivel',                          'Medición',        'Bodega', 0, 'DISPONIBLE'),
 ('Sopladora',                      'Maquinaria',      'Bodega', 0, 'DISPONIBLE'),
 ('Escalera',                       'Acceso',          'Bodega', 0, 'DISPONIBLE'),
 ('Botiquín de primeros auxilios',  'Seguridad',       'Bodega', 1, 'DISPONIBLE'),
 ('Camilla',                        'Seguridad',       'Bodega', 1, 'DISPONIBLE'),
 ('Pala',                           'Herramienta manual','Bodega', 2, 'DISPONIBLE'),
 ('Codal',                          'Construcción',    'Bodega', 3, 'DISPONIBLE'),
 ('Manguera',                       'Construcción',    'Bodega', 0, 'DISPONIBLE'),
 ('Extintor',                       'Seguridad',       'Bodega', 1, 'DISPONIBLE'),
 ('Señalamiento de salida de emergencia','Seguridad',  'Bodega', 0, 'DISPONIBLE');

-- Cada cantidad entra como movimiento "Stock inicial" (el stock se calcula solo)
insert into public.movimientos (herramienta_id, tipo, cantidad, responsable, observacion)
select h.id, 'ENTRADA', v.cant, 'Sistema', 'Stock inicial'
from (values
 ('Equipo de altura',5),('Destornillador',5),('Casco de construcción',10),('Radio con cargador onda larga',11),
 ('Cortador de cerámica',6),('Motor de concretador',2),('Cizalla',2),('Escuadra',3),('Mango de sierra',2),
 ('Nivel',1),('Sopladora',1),('Escalera',1),('Botiquín de primeros auxilios',1),('Camilla',1),('Pala',7),
 ('Codal',17),('Manguera',1),('Extintor',1)
) as v(nombre, cant)
join public.herramientas h on h.nombre = v.nombre;
-- Repuestos varios y señalamientos quedan en 0: la cantidad no estaba especificada.
