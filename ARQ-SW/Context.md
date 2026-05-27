# UNIVERSIDAD DIEGO PORTALES

## Escuela de Ingenier ́ıa Inform ́atica y Telecomunicaciones

# Informe II de Modelamiento RepararIA

## Integrantes: Aar ́on Pozas Oyarce, Diego P ́erez Carrasco, Alex

## Marambio Leyton y Diego Mu ̃noz Barra

```
Arquitectura de Software
```
```
Profesor de C ́atedra: Juan Ricardo Giadach
```
```
Fecha de entrega: 02/05/
```

## ́Indice


- 1. Introducci ́on
- 2. Equipo de Trabajo
   - 2.1. Organizaci ́on del Trabajo
- 3. Descripci ́on del Sistema y Contexto Organizacional
   - 3.1. La Organizaci ́on: Taller Mec ́anico
   - 3.2. Area de Trabajo: Operaciones y Gesti ́on T ́ecnica ́
   - 3.3. Problem ́atica Actual
   - 3.4. Sistema Propuesto: RepararIA
   - 3.5. Beneficios Esperados
- 4. Objetivos y Perfiles de Usuario
   - 4.1. Objetivos del Sistema
      - 4.1.1. Objetivo General
      - 4.1.2. Objetivos Espec ́ıficos
   - 4.2. Perfiles de Usuario
      - 4.2.1. Administrador / Due ̃no del Taller
      - 4.2.2. Mec ́anico
      - 4.2.3. Cliente
      - 4.2.4. Administrador del Sistema
- 5. Requerimientos Funcionales
   - 5.1. Requerimientos Funcionales - Gesti ́on Base e IA
   - 5.2. Requerimientos Funcionales - Operaciones y Configuraci ́on
   - 5.3. Requerimientos No Funcionales
- 6. Modelo de Datos
   - 6.1. Mecanismo de Persistencia
   - 6.2. Modelo Entidad-Relaci ́on
   - 6.3. Descripci ́on de Entidades
   - 6.4. Diccionario de Datos
- 7. Arquitectura SOA: Componentes Cliente y Servicio
   - 7.1. Visi ́on General de la Arquitectura
   - 7.2. Diagrama de Arquitectura SOA
   - 7.3. Componentes Cliente
      - 7.3.1. Portal Web del Administrador
      - 7.3.2. Portal Web del Mec ́anico
      - 7.3.3. Portal Web del Cliente
      - 7.3.4. Aplicaci ́on M ́ovil (componente futuro)
   - 7.4. Componentes Servicio
      - 7.4.1. Servicio de Autenticaci ́on
      - 7.4.2. Servicio de Clientes
      - 7.4.3. Servicio de Veh ́ıculos
      - 7.4.4. Servicio deOrdenes de Trabajo ́
      - 7.4.5. Servicio de Inventario
      - 7.4.6. Servicio de Facturaci ́on
      - 7.4.7. Servicio de Dashboard y Reportes
      - 7.4.8. Servicio de Notificaciones
      - 7.4.9. Servicio de IA (Chatbot + RAG)
- 8. Interfaces de los Componentes
   - 8.1. Interfaces de Componentes Cliente
      - 8.1.1. Interfaz del Portal Web del Administrador
      - 8.1.2. Interfaz del Portal Web del Mec ́anico
      - 8.1.3. Interfaz del Portal Web del Cliente
   - 8.2. Interfaces de Componentes Servicio (APIs REST)
      - 8.2.1. Interfaz del Servicio de Autenticaci ́on
      - 8.2.2. Interfaz del Servicio de Clientes
      - 8.2.3. Interfaz del Servicio de Veh ́ıculos
      - 8.2.4. Interfaz del Servicio deOrdenes de Trabajo ́
      - 8.2.5. Interfaz del Servicio de Inventario
      - 8.2.6. Interfaz del Servicio de Facturaci ́on
      - 8.2.7. Interfaz del Servicio de Dashboard y Reportes
      - 8.2.8. Interfaz del Servicio de Notificaciones
      - 8.2.9. Interfaz del Servicio de IA (Chatbot + RAG)
- 9. Conclusi ́on


## 1. Introducci ́on

Actualmente los talleres mec ́anicos especializados (y tambi ́en los que no) enfrentan proble-
mas/desaf ́ıos significativos en la gesti ́on del trabajo de manera diaria. Las herramientas que
utilizan suelen ser del tipo ́ordenes de trabajo en papel, comunicaci ́on con clientes mediante
mensajer ́ıa informal (como WhatsApp) y la documentaci ́on t ́ecnica dispersa en manuales f ́ısi-
cos o el mero conocimiento mismo del mec ́anico. Esta realidad genera ineficiencias operativas,
p ́erdida de trazabilidad de los procesos realizados, falta de trasparencia con los clientes y una
alta dependencia del conocimiento t ́ecnico concentrado en los mec ́anicos m ́as experimentados,
lo que representa un riesgo para la continuidad del negocio.
La organizaci ́on para la cual se desarrollar ́a el proyecto es un taller mec ́anico especializado
en una marca espec ́ıfica de autos. Actualmente el taller opera con procesos manuales, las
́ordenes de trabajo se registran en papel, el seguimiento de reparaciones es informal, no existe
un historial centralizado de veh ́ıculos y clientes, y los due ̃nos del taller carecen de m ́etricas
confiables para la toma de decisiones. Adem ́as, los mec ́anicos deben consultar manuales
t ́ecnicos f ́ısicos o apoyarse ́unicamente en su experiencia para diagnosticar y resolver fallas,
lo que prolonga los tiempos de reparaci ́on y afecta la calidad del servicio.
Es por ello que se propone el desarrollo de un sistema integral CRM/ERP de gesti ́on
operativa para talleres mec ́anicos especializados, el cual ser ́a construido bajo una Arquitec-
tura Orientada a Servicios (SOA) para garantizar su escalabilidad y tambi ́en capacidad
de integraci ́on con futuros componentes. El grueso del sistema ser ́a la adici ́on de un chatbot
inteligente con la capacidad de poder realizar consultas referidas al taller para su manejo
(inventario, m ́etricas, facturaci ́on, ́ordenes, etc), orientado al administrador, como tambi ́en
para consultas propias del trabajo del mec ́anico, permitiendo consultar documentaci ́on t ́ecni-
ca especializada facilitando el diagn ́ostico y el arreglo de los veh ́ıculos.
El sistema centralizar ́a la gesti ́on de ́ordenes de trabajo, clientes, veh ́ıculos, proporcionan-
do una soluci ́on que digitaliza por completo la operaci ́on del taller. Esto permitir ́a mejorar la
eficiencia operativa, facilitar la soluci ́on de problemas mec ́anicos, ofrecer mayor transparencia
a los clientes y entregar herramientas anal ́ıticas para la gesti ́on del negocio.
El presente informe corresponde a la fase de an ́alisis inicial del proyecto y aborda los
aspectos de la conformaci ́on del equipo de trabajo, la descripci ́on del sistema propuesto y del
contexto organizacional, los objetivos que se buscan alcanzar, los perfiles de usuario a los que
apela y los requerimientos funcionales que guiar ́an el desarrollo. Se espera que este documento
sea la base para las etapas que siguen del proyecto, que incluyen el dise ̃no arquitect ́onico SOA,
la definici ́on del modelo de datos y la implementaci ́on del sistema, entre varias etapas m ́as.


## 2. Equipo de Trabajo

Para el desarrollo del sistema se ha conformado un equipo de cuatro integrantes. La
asignaci ́on de roles y responsabilidades ha sido definida considerando las ́areas clave del
proyecto: gesti ́on y liderazgo, arquitectura e infraestructura, an ́alisis y desarrollo backend,
inteligencia artificial y desarrollo frontend con aseguramiento de calidad.
La Tabla 1 presenta la estructura del equipo, los roles asignados a cada integrante y sus
responsabilidades espec ́ıficas:

```
Tabla 1: Conformaci ́on del equipo de trabajo
```
```
Integrante Rol Responsabilidades
Diego P ́erez Ca-
rrasco
```
```
Jefe de Proyecto +
Arquitecto de Soft-
ware + DevOps
```
```
Liderazgo estrat ́egico y operativo del proyec-
to, definici ́on de la arquitectura orientada a
servicios (SOA), supervisi ́on t ́ecnica, coordi-
naci ́on con stakeholders, gesti ́on de entregas
y cumplimiento de plazos, configuraci ́on de
entornos de desarrollo y producci ́on, imple-
mentaci ́on de pipeline CI/CD, gesti ́on de des-
pliegues y monitoreo de infraestructura.
Aar ́on Pozas
Oyarce
```
```
Analista de Reque-
rimientos + Desa-
rrollador Backend
```
```
Levantamiento y documentaci ́on de requisi-
tos funcionales y no funcionales, validaci ́on
con usuarios, definici ́on de casos de uso, di-
se ̃no e implementaci ́on de APIs, desarrollo de
la l ́ogica de negocio, modelado y gesti ́on de
base de datos, integraci ́on con servicios ex-
ternos.
Alex Marambio
Leyton
```
```
Especialista en
IA/ML + Desarro-
llador Backend
```
```
Implementaci ́on del chatbot conversacio-
nal, desarrollo del sistema RAG (Retrieval-
Augmented Generation) para consulta de do-
cumentaci ́on t ́ecnica, integraci ́on de modelos
de lenguaje, procesamiento de lenguaje natu-
ral, soporte en backend para funcionalidades
de inteligencia artificial.
Diego Mu ̃noz
Barra
```
```
Desarrollador Fron-
tend + Tester/QA
```
```
Implementaci ́on de la interfaz de usuario, de-
sarrollo de componentes visuales, optimiza-
ci ́on de la experiencia de usuario, consumo
de APIs backend, ejecuci ́on de pruebas fun-
cionales y de integraci ́on, automatizaci ́on de
pruebas, reporte y seguimiento de defectos,
validaci ́on de calidad del software.
```

### 2.1. Organizaci ́on del Trabajo

El equipo operar ́a bajo metodolog ́ıa ́agil (SCRUM), con reuniones de coordinaci ́on sema-
nales para el seguimiento de avances, identificaci ́on de riesgos y ajuste de prioridades. La
comunicaci ́on se mantendr ́a de manera fluida mediante herramientas colaborativas, asegu-
rando que todos los integrantes est ́en alineados con los objetivos del proyecto y los hitos de
entrega establecidos.

## 3. Descripci ́on del Sistema y Contexto Organizacional

### 3.1. La Organizaci ́on: Taller Mec ́anico

La organizaci ́on para la cual se desarrolla el presente proyecto es un taller mec ́anico
especializado de mediana envergadura, ubicado en la Regi ́on Metropolitana de Chile. El
taller cuenta con m ́as de 10 a ̃nos de trayectoria en el mercado y se ha consolidado como
un referente en la reparaci ́on y mantenimiento de una marca espec ́ıfica de veh ́ıculos de alta
gama.

Caracter ́ısticas principales del taller:

```
Especializaci ́on: Marca ́unica de veh ́ıculos (servicio t ́ecnico oficial y especializado)
```
```
Infraestructura: Zona de reparaci ́on (fosos y elevadores), bancos de trabajo, ́area de
diagn ́ostico, almac ́en de repuestos/neum ́aticos, ́area de recepci ́on y oficina administra-
tiva
```
```
Personal: 6 funcionarios (1 administrativos, 5 mec ́anicos)
```
```
Capacidad de atenci ́on: Promedio de 6 a 9 veh ́ıculos diarios
```
```
Servicios ofrecidos: Mantenimiento preventivo, reparaciones mec ́anicas, diagn ́ostico
electr ́onico, servicio de frenos, suspensi ́on y motor
```
### 3.2. Area de Trabajo: Operaciones y Gesti ́on T ́ecnica ́

```
El ́area operativa del taller est ́a compuesta por dos unidades funcionales principales:
```
Unidad de Mec ́anica y Diagn ́ostico

Responsable de la ejecuci ́on de las ́ordenes de trabajo, diagn ́ostico de fallas, reparaci ́on
de veh ́ıculos y control de calidad. En esta unidad se desempe ̃nan los mec ́anicos, quienes
actualmente enfrentan dificultades para acceder de manera ́agil a la documentaci ́on t ́ecnica
necesaria para cada reparaci ́on.


Unidad de Administraci ́on y Atenci ́on al Cliente

Responsable de la recepci ́on de veh ́ıculos, registro de ́ordenes de trabajo, comunicaci ́on con
clientes, facturaci ́on y gesti ́on financiera del taller. Esta unidad est ́a compuesta por personal
administrativo que gestiona la relaci ́on con los clientes y el flujo de trabajo del taller.

### 3.3. Problem ́atica Actual

Actualmente, el taller opera con procesos manuales o apoyados en herramientas no inte-
gradas. La Tabla 2 resume las principales problem ́aticas identificadas en cada ́area.

```
Tabla 2: Problem ́aticas actuales por ́area
```
```
Area ́ Problem ́atica
Gesti ́on de ́ordenes de
trabajo
```
```
Registro manual en papel o planillas Excel, dificultad
para dar seguimiento, p ́erdida de informaci ́on, falta de
historial centralizado por veh ́ıculo y cliente.
Comunicaci ́on con
clientes
```
```
Uso de WhatsApp informal como principal canal, sin
trazabilidad ni registro formal, falta de transparencia
sobre el estado de las reparaciones.
Acceso a documenta-
ci ́on t ́ecnica
```
```
Manuales f ́ısicos dispersos o archivos digitales no or-
ganizados, dependencia casi exclusiva del conocimiento
de mec ́anicos experimentados, tiempos prolongados en
diagn ́ostico.
Gesti ́on administrati-
va
```
```
Ausencia de m ́etricas confiables para toma de decisiones,
dificultad para calcular rentabilidad y viabilidad por or-
den de trabajo, falta de control de inventario de repues-
tos.
Trazabilidad Inexistencia de un historial completo de reparaciones por
veh ́ıculo, imposibilidad de analizar recurrencias de fallas
o calidad del servicio.
```
### 3.4. Sistema Propuesto: RepararIA

Ante la problem ́atica descrita, se propuso el desarrollo de RepararIA, un sistema integral
de gesti ́on operativa para talleres mec ́anicos especializados. La soluci ́on se construir ́a bajo una
Arquitectura Orientada a Servicios (SOA), garantizando escalabilidad, modularidad y
capacidad de integraci ́on con futuros componentes.


Caracter ́ısticas principales del sistema:

```
Gesti ́on centralizada: Registro y seguimiento de ́ordenes de trabajo, clientes, veh ́ıcu-
los e historial de reparaciones en una plataforma unificada.
```
```
Asistente t ́ecnico con IA: Implementaci ́on de un chatbot potenciado por RAG
(Retrieval-Augmented Generation) que permite a los mec ́anicos consultar documen-
taci ́on t ́ecnica especializada mediante lenguaje natural, facilitando el diagn ́ostico y la
reparaci ́on de veh ́ıculos.
```
```
Chatbot de negocio: Asistente conversacional para administradores y due ̃nos del
taller, con capacidad de consultar en tiempo real indicadores clave, estado de ́ordenes
de trabajo, m ́etricas operativas y an ́alisis financieros.
```
```
Comunicaci ́on con clientes: Portal o notificaciones que permiten al cliente conocer
el estado de su veh ́ıculo durante el proceso de reparaci ́on, mejorando la transparencia
y la experiencia de servicio.
```
```
Reportes y an ́alisis: Generaci ́on de informes gerenciales y operativos, dashboards con
indicadores clave, an ́alisis de productividad por mec ́anico y rentabilidad por orden de
trabajo.
```
### 3.5. Beneficios Esperados

```
La implementaci ́on de RepararIA permitir ́a al taller:
```
```
Digitalizar completamente la operaci ́on, eliminando el uso de papel reduciendo tiempos,
errores y ahorrando costos administrativos.
```
```
Mejorar la eficiencia operativa mediante la reducci ́on de tiempos de diagn ́ostico y re-
paraci ́on.
```
```
Reducir la dependencia del conocimiento t ́acito concentrado en mec ́anicos experimen-
tados para resolver problemas complejos.
```
```
Ofrecer mayor transparencia a los clientes sobre el estado de sus veh ́ıculos.
```
```
Entregar herramientas anal ́ıticas para la toma de decisiones estrat ́egicas.
```
```
Centralizar el historial de reparaciones por veh ́ıculo, permitiendo trazabilidad completa.
```

## 4. Objetivos y Perfiles de Usuario

### 4.1. Objetivos del Sistema

#### 4.1.1. Objetivo General

Desarrollar un sistema integral de gesti ́on operativa para talleres mec ́anicos especializa-
dos que digitalice y centralice los procesos clave del negocio, incorporando capacidades de
inteligencia artificial para optimizar el diagn ́ostico t ́ecnico y facilitar la toma de decisiones
gerenciales, mejorando as ́ı la eficiencia operativa y la calidad del servicio entregado.

#### 4.1.2. Objetivos Espec ́ıficos

1. Centralizar la gesti ́on operativa: Implementar una plataforma unificada que per-
    mita registrar y dar seguimiento a ́ordenes de trabajo, clientes, veh ́ıculos e historial de
    reparaciones, eliminando el uso de registros manuales en papel.
2. Implementar asistente t ́ecnico con IA: Desarrollar un chatbot que permita a los
    mec ́anicos consultar documentaci ́on t ́ecnica especializada, reduciendo los tiempos de
    diagn ́ostico y la dependencia del conocimiento concentrado.
3. Incorporar chatbot de negocio: Proveer un asistente conversacional para admi-
    nistradores que permita consultar indicadores clave, estado de ́ordenes de trabajo y
    m ́etricas operativas en tiempo real.
4. Mejorar la trazabilidad: Establecer un historial completo y accesible de todas las
    reparaciones realizadas por veh ́ıculo, permitiendo identificar recurrencias de fallas y
    evaluar la calidad del servicio.
5. Optimizar la comunicaci ́on con clientes: Implementar mecanismos que permitan
    al cliente conocer el estado de su veh ́ıculo durante el proceso de reparaci ́on, aumentando
    la transparencia y satisfacci ́on.
6. Reducir tiempos operativos: Disminuir en al menos un 25 % el tiempo dedicado a
    tareas administrativas y de b ́usqueda de informaci ́on t ́ecnica mediante la automatiza-
    ci ́on y centralizaci ́on de procesos.
7. Entregar herramientas anal ́ıticas: Proveer dashboards y reportes gerenciales con
    indicadores clave de negocio, como productividad por mec ́anico, rentabilidad por orden
    de trabajo y an ́alisis de demanda de servicios.
8. Garantizar escalabilidad: Construir el sistema bajo una Arquitectura Orientada a
    Servicios (SOA) que permita la incorporaci ́on de nuevos m ́odulos y la integraci ́on con
    sistemas externos en el futuro.


### 4.2. Perfiles de Usuario

El sistema est ́a dise ̃nado para atender las necesidades de diferentes tipos de usuarios, cada
uno con roles, responsabilidades y requerimientos espec ́ıficos. La Tabla 3 presenta los perfiles
de usuario identificados.


```
Tabla 3: Perfiles de usuario del sistema
```
```
Perfil Rol Necesidades Prin-
cipales
```
```
Frecuencia de uso
```
```
Administrador /
Due ̃no del taller
```
```
Gesti ́on estrat ́egi-
ca, toma de deci-
siones, gesti ́on de
ordenes, atenci ́on
al cliente
```
```
Dashboards eje-
cutivos, reportes
financieros, indicado-
res de productividad,
chatbot de nego-
cio para consultas
r ́apidas, registro de
́ordenes, gesti ́on de
clientes, comunicaci ́on
y dem ́as
```
```
Diaria
```
```
Mec ́anico Ejecuci ́on de
reparaciones y
diagn ́ostico
```
```
Acceso a documenta-
ci ́on t ́ecnica, asistente
IA para consultas, re-
gistro de trabajo reali-
zado, visualizaci ́on de
́ordenes asignadas
```
```
Permanente durante
jornada laboral
```
```
Cliente Solicitud de servi-
cios y seguimiento
```
```
Consulta de estado
de reparaci ́on, histo-
rial de servicios de
su veh ́ıculo, comunica-
ci ́on con el taller
```
```
Espor ́adica y/o cir-
cunstancial
```
```
Administrador
del sistema
```
```
Mantenimiento
t ́ecnico y configu-
raci ́on
```
```
Gesti ́on de usuarios
y permisos, configu-
raci ́on de par ́ametros,
respaldos, monitoreo
del sistema
```
```
Semanal o seg ́un re-
querimiento del taller
```
#### 4.2.1. Administrador / Due ̃no del Taller

Usuario con visi ́on estrat ́egica del negocio, responsable de la toma de decisiones, supervi-
si ́on de la rentabilidad y planificaci ́on del taller. Requiere acceso a informaci ́on consolidada,
indicadores clave y capacidad de realizar consultas mediante lenguaje natural a trav ́es del
chatbot de negocio. Adem ́as de estar encargado de la gesti ́on operativa del taller, recepci ́on
de vehiculos, registrar ordenes de trabajo, atenci ́on al cliente. Su nivel t ́ecnico es intermedio
y utiliza el sistema a diario para monitorear la operaci ́on.


#### 4.2.2. Mec ́anico

Usuario operativo principal del taller, responsable del diagn ́ostico y reparaci ́on de veh ́ıcu-
los. Necesita acceder r ́apidamente a documentaci ́on t ́ecnica, manuales de reparaci ́on y especi-
ficaciones propias de la marca de veh ́ıculos en la que el taller est ́a especializado. El asistente
t ́ecnico con IA es su principal herramienta de apoyo, permiti ́endole realizar consultas. Su
nivel t ́ecnico es b ́asico en el uso de sistemas inform ́aticos, por lo que la interfaz debe ser
intuitiva. Utiliza el sistema de manera permanente durante su jornada laboral.

#### 4.2.3. Cliente

Usuario externo que interact ́ua con el sistema principalmente para consultar el estado de
su veh ́ıculo durante el proceso de reparaci ́on y acceder al historial de servicios realizados. Su
interacci ́on es espor ́adica y se espera que pueda acceder mediante una interfaz web sencilla
o notificaciones. Su nivel t ́ecnico es variable, por lo que la experiencia de usuario debe ser
clara y accesible.

#### 4.2.4. Administrador del Sistema

Usuario t ́ecnico responsable del mantenimiento, configuraci ́on y seguridad del sistema.
Gestiona usuarios, roles y permisos, realiza respaldos, monitorea el rendimiento y atiende
incidencias t ́ecnicas. Su nivel t ́ecnico es avanzado y su frecuencia de uso es semanal o bajo
requerimiento espec ́ıfico.


## 5. Requerimientos Funcionales

Los requerimientos funcionales representan las capacidades y comportamientos que debe
tener el sistema para satisfacer las necesidades de los usuarios.

### 5.1. Requerimientos Funcionales - Gesti ́on Base e IA

```
Tabla 4: Requerimientos Funcionales (Parte 1.1): Gesti ́on Base e IA
```
```
C ́odigo Nombre Descripci ́on
RF-001 Gesti ́on de
Usuarios y Au-
tenticaci ́on
```
```
Permitir el registro, inicio de sesi ́on y gesti ́on de usuarios
del sistema. Debe soportar diferentes roles (administrador,
mec ́anico, administrativo, cliente) con permisos espec ́ıficos.
Incluir funcionalidades de recuperaci ́on de contrase ̃na y cie-
rre de sesi ́on.
RF-002 Gesti ́on de
Clientes
```
```
Registrar, modificar, consultar y eliminar clientes. Ca-
da cliente debe contar con datos de contacto (nombre,
tel ́efono, correo electr ́onico, direcci ́on) y un historial aso-
ciado de veh ́ıculos y ́ordenes de trabajo.
RF-003 Gesti ́on de
Veh ́ıculos
```
```
Registrar, modificar, consultar y eliminar veh ́ıculos. Cada
veh ́ıculo debe estar asociado a un cliente e incluir informa-
ci ́on como patente, marca, modelo, a ̃no, n ́umero de motor
y kilometraje actual.
RF-004 Gesti ́on de
Ordenes de Tra- ́
bajo
```
```
Crear, modificar, consultar y cerrar ́ordenes de trabajo.
Cada orden debe incluir cliente, veh ́ıculo, fecha de ingreso,
descripci ́on del problema, diagn ́ostico, trabajos realizados,
repuestos utilizados, costo total y estado (pendiente, en
taller, en reparaci ́on, listo, entregado).
RF-005 Asistente T ́ecni-
co con IA
```
```
Implementar un chatbot que permita a los mec ́anicos reali-
zar consultas sobre documentaci ́on t ́ecnica, procedimientos
de reparaci ́on, especificaciones de veh ́ıculos y c ́odigos de fa-
lla.
RF-006 Chatbot de Ne-
gocio
```
```
Implementar un chatbot para administradores que permi-
ta consultar en lenguaje natural informaci ́on sobre m ́etri-
cas del taller, como ́ordenes de trabajo activas, ingresos del
per ́ıodo, productividad por mec ́anico, veh ́ıculos en repara-
ci ́on y otros indicadores clave.
```

```
Tabla 5: Requerimientos Funcionales (Parte 1.2): Gesti ́on Base e IA
```
```
C ́odigo Nombre Descripci ́on
RF-007 Historial de Re-
paraciones
```
```
Mantener un historial completo de todas las ́ordenes de tra-
bajo asociadas a cada veh ́ıculo y cliente. Permitir consultar
reparaciones anteriores, trabajos realizados, repuestos uti-
lizados y observaciones t ́ecnicas.
```
### 5.2. Requerimientos Funcionales - Operaciones y Configuraci ́on

```
Tabla 6: Requerimientos Funcionales (Parte 2.1): Operaciones y Configuraci ́on
```
```
C ́odi-
go
```
```
Nombre Descripci ́on
```
##### RF-

##### 008

```
Gesti ́on de In-
ventario de Re-
puestos
```
```
Registrar, modificar, consultar y controlar el stock de re-
puestos utilizados en el taller. Debe permitir asociar re-
puestos a ́ordenes de trabajo, actualizar autom ́aticamente
el stock al consumir repuestos y generar alertas de stock
m ́ınimo.
RF-
009
```
```
Comunicaci ́on
con Clientes
```
```
Permitir al personal administrativo enviar notificaciones a
clientes sobre el estado de sus veh ́ıculos. Incluir funcionali-
dad para que los clientes puedan consultar el estado de su
orden de trabajo a trav ́es de un portal web accesible con
su n ́umero de orden o patente.
RF-
010
```
```
Gesti ́on de Fac-
turaci ́on
```
```
Generar documentos de facturaci ́on asociados a ́ordenes de
trabajo completadas. Permitir registro de pagos, visuali-
zar historial de facturas y generar reportes de ingresos por
per ́ıodo.
RF-
011
```
```
Dashboard y Re-
portes
```
```
Proveer dashboards personalizados por tipo de usuario: pa-
ra administrador (indicadores financieros y operativos), pa-
ra mec ́anico ( ́ordenes asignadas, productividad), para ad-
ministrativo ( ́ordenes pendientes, clientes atendidos). Ge-
nerar reportes exportables (Excel, PDF) de ́ordenes de tra-
bajo, ingresos, consumo de repuestos y productividad.
RF-
012
```
```
B ́usqueda y Fil-
tros
```
```
Permitir b ́usquedas r ́apidas y filtros en todas las entidades
del sistema: clientes, veh ́ıculos, ́ordenes de trabajo y re-
puestos. Los criterios de b ́usqueda deben incluir m ́ultiples
campos (nombre, patente, estado, fecha, etc.) y permitir
ordenar resultados.
```

```
Tabla 7: Requerimientos Funcionales (Parte 2.2): Operaciones y Configuraci ́on
```
```
C ́odi-
go
```
```
Nombre Descripci ́on
```
##### RF-

##### 013

```
Configuraci ́on
del Sistema
```
```
Permitir la configuraci ́on de par ́ametros del sistema: datos
del taller (nombre, direcci ́on, contacto), definici ́on de roles
y permisos, categor ́ıas de servicios, tipos de reparaci ́on y
unidades de medida.
RF-
014
```
```
Registro de Ac-
tividades (Audi-
tor ́ıa)
```
```
Mantener un registro de todas las acciones importantes rea-
lizadas en el sistema (creaci ́on, modificaci ́on, eliminaci ́on),
indicando usuario responsable, fecha, hora y descripci ́on
de la acci ́on. Este registro debe ser consultable ́unicamente
por administradores del sistema.
```
### 5.3. Requerimientos No Funcionales

Adem ́as de los requerimientos funcionales, el sistema deber ́a cumplir con los siguientes
requerimientos no funcionales que orientan la calidad y el desempe ̃no de la soluci ́on:


```
Tabla 8: Requerimientos No Funcionales
```
```
Categor ́ıa Descripci ́on
Arquitectura El sistema debe ser construido bajo una Arquitectura Orienta-
da a Servicios (SOA), garantizando la modularidad, reusabili-
dad e independencia de los componentes.
Escalabilidad La plataforma debe permitir la incorporaci ́on de nuevos m ́odu-
los y funcionalidades sin afectar los existentes.
Seguridad La autenticaci ́on debe ser segura mediante contrase ̃nas encrip-
tadas. Los permisos deben ser gestionados por roles, aseguran-
do que cada usuario acceda ́unicamente a las funcionalidades
autorizadas.
Disponibilidad El sistema debe estar disponible durante el horario de opera-
ci ́on del taller (lunes a viernes de 8:00 a 19:00 horas), con un
tiempo de inactividad planificado m ́ınimo.
Rendimiento Los tiempos de respuesta para consultas y transacciones comu-
nes no deben superar los 3 segundos bajo condiciones normales
de operaci ́on.
Usabilidad La interfaz debe ser intuitiva y adaptada a los diferentes perfiles
de usuario, considerando que los mec ́anicos y clientes pueden
tener niveles t ́ecnicos b ́asicos.
Mantenibilidad El c ́odigo debe estar documentado y seguir est ́andares de desa-
rrollo que faciliten el mantenimiento y la evoluci ́on del sistema.
InteroperabilidadLos servicios expuestos deben contar con APIs documentadas
que permitan futuras integraciones con sistemas externos (co-
mo plataformas de facturaci ́on electr ́onica o proveedores de re-
puestos).
```
## 6. Modelo de Datos

### 6.1. Mecanismo de Persistencia

Para el sistema RepararIA se ha seleccionado como mecanismo de persistencia prin-
cipal una base de datos relacional, implementada con PostgreSQL. Esta elecci ́on se
fundamenta en la naturaleza estructurada y altamente relacional de las entidades (clientes,
veh ́ıculos, ́ordenes, repuestos, facturas), que necesitan una integridad estricta y soporte pa-
ra transacciones ACID. Adem ́as PostgreSQL ofrece escalabilidad robusta y es ampliamente
compatible con los frameworks del stack tecnol ́ogico.
Para todo lo relacionado a la inteligencia artificial, se utilizar ́a una base de datos vectorial
complementaria ChromaDB destinada a almacenar los embeddings de la documentaci ́on
t ́ecnica procesada por el sistema RAG. Este almacenamiento vectorial permite las b ́usquedas


sem ́anticas necesarias para que el chatbot t ́ecnico recupere los fragmentos de documentaci ́on
m ́as relevantes ante cada consulta del mec ́anico.

### 6.2. Modelo Entidad-Relaci ́on

El modelo de datos se organiza en torno a las siguientes entidades principales y sus
relaciones. La Figura 1 presenta el diagrama entidad-relaci ́on del sistema.

```
Figura 1: Modelo Entidad-Relaci ́on
```

### 6.3. Descripci ́on de Entidades

```
A continuaci ́on se describen las principales entidades del modelo de datos:
```
##### USUARIO

Representa a todos las personas internas del sistema (administrador, mec ́anico, adminis-
trador del sistema). Contiene las credenciales de acceso y el rol que determina los permisos
otorgados dentro del sistema.

##### CLIENTE

Entidad que registra a los clientes del taller. Se vincula con sus veh ́ıculos y con las ́ordenes
de trabajo generadas a su nombre. Almacena los datos de contacto y permite el seguimiento
hist ́orico en el taller.

##### VEH ́ICULO

Representa los veh ́ıculos de los clientes. Cada veh ́ıculo est ́a asociado a exactamente un
cliente y puede tener m ́ultiples ́ordenes de trabajo a lo largo del tiempo, construyendo as ́ı su
historial de reparaciones.

##### ORDENTRABAJO

Entidad central del sistema. Registra cada intervenci ́on realizada sobre un veh ́ıculo, vin-
culando al cliente, al veh ́ıculo y al mec ́anico responsable. Incluye el ciclo completo de vida
de la reparaci ́on, desde el ingreso del veh ́ıculo hasta su entrega.

##### REPUESTO

Representa el inventario de piezas y materiales disponibles en el taller. Controla el stock
y los precios, y se relaciona con las ́ordenes de trabajo a trav ́es de la tabla intermedia OR-
DENREPUESTO.

##### ORDENREPUESTO

Tabla de relaci ́on muchos-a-muchos entre ORDENTRABAJO y REPUESTO. Registra
qu ́e repuestos fueron utilizados en cada orden, con su cantidad y precio al momento del uso.

##### FACTURA

Documento de cobro generado al completar una orden de trabajo. Registra el monto total,
la fecha de emisi ́on y el estado del pago. Mantiene una relaci ́on uno a uno con la orden de
trabajo que la origina.


##### AUDITOR ́IA

Registro de trazabilidad del sistema. Almacena cada acci ́on relevante ejecutada por los
usuarios internos, con indicaci ́on del usuario responsable, la entidad afectada y la marca
temporal de la acci ́on.

### 6.4. Diccionario de Datos

```
A continuaci ́on se presenta el diccionario de datos de las entidades principales del sistema.
```
```
Tabla 9: Diccionario de datos – Entidad USUARIO
```
```
Atributo Tipo Restricci ́onNulo PK/FKDescripci ́on
idusuario SERIAL UNIQUE NO PK Identificador ́unico auto-
incremental del usuario
nombre VARCHAR
(100)
```
- NO – Nombre completo del
    usuario
email VARCHAR
(150)

```
UNIQUE NO – Correo electr ́onico, usado
como identificador de ac-
ceso
passwordhash VARCHAR
(255)
```
- NO – Contrase ̃na almacenada
    con hash bcrypt
rol VARCHAR
(30)

```
CHECK NO – Rol del usuario: adminis-
trador, mec ́anico, cliente,
sysadmin
activo BOOLEAN DEFAULT
TRUE
```
```
NO – Indica si el usuario est ́a
habilitado en el sistema
fechacreacion TIMESTAMPDEFAULT
NOW()
```
```
NO – Fecha y hora de creaci ́on
del registro
```

```
Tabla 10: Diccionario de datos – Entidad CLIENTE
```
Atributo Tipo Restricci ́onNulo PK/FKDescripci ́on

idcliente SERIAL UNIQUE NO PK Identificador ́unico auto-
incremental del cliente

rut VARCHAR
(12)

```
UNIQUE NO – RUT del cliente (formato
chileno, con d ́ıgito verifi-
cador)
```
nombre VARCHAR
(100)

- NO – Nombre completo del
    cliente

telefono VARCHAR
(20)

- S ́I – N ́umero de tel ́efono de
    contacto

email VARCHAR
(150)

- S ́I – Correo electr ́onico de
    contacto

direccion TEXT – S ́I – Direcci ́on f ́ısica del clien-
te

fecharegistro TIMESTAMPDEFAULT
NOW()

```
NO – Fecha de primera aten-
ci ́on en el taller
```
```
Tabla 11: Diccionario de datos – Entidad VEH ́ICULO
```
Atributo Tipo Restricci ́onNulo PK/FKDescripci ́on

idvehiculo SERIAL UNIQUE NO PK Identificador ́unico auto-
incremental del veh ́ıculo

idcliente INTEGER – NO FK Referencia al cliente pro-
pietario del veh ́ıculo

patente VARCHAR
(8)

```
UNIQUE NO – Patente del veh ́ıculo (for-
mato chileno)
```
marca VARCHAR
(60)

- NO – Marca del veh ́ıculo (fija
    para el taller especializa-
    do)

modelo VARCHAR
(60)

- NO – Modelo espec ́ıfico del
    veh ́ıculo

anio SMALLINT CHECK
(> 1970)

```
NO – A ̃no de fabricaci ́on del
veh ́ıculo
```
nummotor VARCHAR
(30)

```
UNIQUE S ́I – N ́umero de motor del
veh ́ıculo
```

Atributo Tipo Restricci ́onNulo PK/FKDescripci ́on

kilometraje INTEGER ≥ 0 NO – Kilometraje registrado al
momento del ́ultimo in-
greso

color VARCHAR
(30)

- S ́I – Color del veh ́ıculo


```
Tabla 12: Diccionario de datos – Entidad ORDENTRABAJO
```
Atributo Tipo Restricci ́on Nulo PK/FKDescripci ́on

idorden SERIAL UNIQUE NO PK Identificador ́unico au-
toincremental de la or-
den

idcliente INTEGER – NO FK Referencia al cliente
propietario del veh ́ıcu-
lo

idvehiculo INTEGER – NO FK Referencia al veh ́ıculo
que ingresa a repara-
ci ́on

idmecanico INTEGER – S ́I FK Referencia al usuario
mec ́anico asignado

fechaingreso TIMESTAMPDEFAULT
NOW()

```
NO – Fecha y hora de ingre-
so del veh ́ıculo al taller
```
fechaestimada DATE – S ́I – Fecha estimada de en-
trega del veh ́ıculo

fechaentrega TIMESTAMP– S ́I – Fecha y hora efectiva
de entrega al cliente

descripcion
problema

```
TEXT – NO – Descripci ́on del pro-
blema reportado por
el cliente
```
diagnostico TEXT – S ́I – Diagn ́ostico t ́ecni-
co realizado por el
mec ́anico

trabajos
realizados

```
TEXT – S ́I – Descripci ́on de los tra-
bajos ejecutados
```
estado VARCHAR
(20)

```
CHECK NO – Estado: pen-
diente, entaller,
enreparacion, listo,
entregado
```
costomano
obra

##### NUMERIC

##### (10,2)

```
≥ 0 NO – Costo por concepto de
mano de obra
```
costototal NUMERIC
(10,2)

```
≥ 0 NO – Costo total incluyendo
repuestos y mano de
obra
```

Atributo Tipo Restricci ́on Nulo PK/FKDescripci ́on

observaciones TEXT – S ́I – Observaciones t ́ecni-
cas adicionales del
mec ́anico


```
Tabla 13: Diccionario de datos – Entidad REPUESTO
```
Atributo Tipo Restricci ́onNulo PK/FKDescripci ́on

idrepuesto SERIAL UNIQUE NO PK Identificador ́unico auto-
incremental del repuesto

codigo VARCHAR
(30)

```
UNIQUE NO – C ́odigo identificador del
repuesto (c ́odigo de fabri-
cante)
```
nombre VARCHAR
(150)

- NO – Nombre descriptivo del
    repuesto

descripcion TEXT – S ́I – Descripci ́on detallada del
repuesto y compatibili-
dad

stockactual INTEGER ≥ 0 NO – Cantidad actualmente
disponible en el almac ́en

stockminimo INTEGER ≥ 0 NO – Umbral m ́ınimo que acti-
va alerta de reposici ́on

preciounitario NUMERIC
(10,2)

```
> 0 NO – Precio de venta unitario
del repuesto (CLP)
```
proveedor VARCHAR
(100)

- S ́I – Nombre del proveedor
    principal del repuesto

```
Tabla 14: Diccionario de datos – Entidad FACTURA
```
Atributo Tipo Restricci ́onNulo PK/FKDescripci ́on

idfactura SERIAL UNIQUE NO PK Identificador ́unico auto-
incremental de la factura

idorden INTEGER UNIQUE NO FK Referencia a la orden de
trabajo que origina la
factura

fechaemision TIMESTAMPDEFAULT
NOW()

```
NO – Fecha y hora de emisi ́on
del documento
```
montoneto NUMERIC
(10,2)

```
≥ 0 NO – Monto antes de impues-
tos (CLP)
```
iva NUMERIC
(10,2)

```
≥ 0 NO – Monto de IVA aplicado
(19 %)
```
montototal NUMERIC
(10,2)

```
≥ 0 NO – Monto total a cobrar
incluyendo impuestos
(CLP)
```

Atributo Tipo Restricci ́onNulo PK/FKDescripci ́on

estadopago VARCHAR
(20)

```
CHECK NO – Estado del pago: pen-
diente, pagado, anulado
```
metodopago VARCHAR
(30)

- S ́I – M ́etodo de pago: efecti-
    vo, transferencia, tarjeta


## 7. Arquitectura SOA: Componentes Cliente y Servicio

### 7.1. Visi ́on General de la Arquitectura

El sistema RepararIA se construye sobre una Arquitectura Orientada a Servicios
(SOA), en la que la funcionalidad del sistema se distribuye en un conjunto de servicios
independientes, desacoplados y reutilizables, accesibles mediante interfaces estandarizadas
(APIs REST). Los componentes de tipo cliente corresponden a las interfaces de usuario o
capas de presentaci ́on que consumen los servicios; los componentes de tipo servicio encap-
sulan la l ́ogica de negocio y los datos, exponiendo sus capacidades a trav ́es de endpoints bien
definidos.
La comunicaci ́on entre componentes se realiza a trav ́es de un API Gateway, que centra-
liza el enrutamiento, la autenticaci ́on, el control de acceso y el registro de llamadas (logging).
Esto garantiza que los componentes cliente no accedan directamente a los servicios, man-
teniendo el desacoplamiento propio de SOA y facilitando la incorporaci ́on futura de nuevos
servicios o clientes.

### 7.2. Diagrama de Arquitectura SOA

La Figura 2 presenta la arquitectura SOA del sistema, evidenciando la separaci ́on entre
la capa de clientes, el API Gateway y la capa de servicios, junto con las bases de datos
asociadas.

```
Figura 2: Diagrama SOA
```

### 7.3. Componentes Cliente

Los componentes cliente son las interfaces de usuario a trav ́es de las cuales los distintos
perfiles de usuario interact ́uan con el sistema. Todos ellos se comunican exclusivamente con
el API Gateway, nunca directamente con los servicios.

#### 7.3.1. Portal Web del Administrador

Interfaz web de uso exclusivo del administrador/due ̃no del taller. Provee acceso com-
pleto a todas las funcionalidades del sistema: gesti ́on de ́ordenes de trabajo, clientes, veh ́ıcu-
los, inventario, facturaci ́on y reportes. Incluye acceso al chatbot de negocio para consultas
en lenguaje natural sobre m ́etricas e indicadores operativos.

#### 7.3.2. Portal Web del Mec ́anico

Interfaz web orientada a los mec ́anicos del taller. Dise ̃nada para ser intuitiva y de uso
́agil durante la jornada laboral. Permite visualizar las ́ordenes de trabajo asignadas, registrar
diagn ́osticos y trabajos realizados, y consultar al asistente t ́ecnico con IA para resolver dudas
sobre documentaci ́on t ́ecnica y procedimientos de reparaci ́on.

#### 7.3.3. Portal Web del Cliente

Interfaz de acceso p ́ublico, sin necesidad de cuenta de usuario, accesible mediante n ́umero
de orden de trabajo o patente del veh ́ıculo. Permite al cliente consultar el estado actual de su
veh ́ıculo en reparaci ́on y revisar el historial de servicios realizados. La interfaz es minimalista
y optimizada para dispositivos m ́oviles.

#### 7.3.4. Aplicaci ́on M ́ovil (componente futuro)

Se contempla como extensi ́on futura una aplicaci ́on m ́ovil para iOS y Android, orienta-
da principalmente al personal del taller y a los clientes. Su incorporaci ́on es facilitada por
el dise ̃no SOA del sistema, que permite agregar nuevos clientes sin modificar los servicios
existentes.

### 7.4. Componentes Servicio

Los componentes de servicio encapsulan la l ́ogica de negocio del sistema. Cada servicio
es independiente, expone una API REST documentada y puede ser consumido por cualquier
componente cliente a trav ́es del API Gateway.

#### 7.4.1. Servicio de Autenticaci ́on

Gestiona el registro, inicio de sesi ́on y control de acceso de los usuarios del sistema. Emite
y valida tokens JWT para autenticar las solicitudes entrantes al API Gateway. Administra


los roles y permisos de cada usuario, asegurando que cada perfil acceda ́unicamente a las
funcionalidades autorizadas.

#### 7.4.2. Servicio de Clientes

Expone las operaciones CRUD (Crear, Leer, Actualizar, Eliminar) sobre la entidad Clien-
te. Permite registrar nuevos clientes, actualizar sus datos de contacto, consultar su historial
de veh ́ıculos y ́ordenes de trabajo asociadas.

#### 7.4.3. Servicio de Veh ́ıculos

Gestiona el ciclo de vida de los veh ́ıculos registrados en el sistema. Permite asociar veh ́ıcu-
los a clientes, actualizar el kilometraje al momento del ingreso al taller y consultar el historial
de intervenciones por patente o n ́umero de motor.

#### 7.4.4. Servicio deOrdenes de Trabajo ́

Servicio central del sistema. Gestiona el ciclo completo de las ́ordenes de trabajo: creaci ́on,
asignaci ́on al mec ́anico, actualizaci ́on de estado, registro de diagn ́ostico y trabajos realizados,
y cierre de la orden. Orquesta la interacci ́on con el servicio de inventario al momento de
registrar repuestos utilizados.

#### 7.4.5. Servicio de Inventario

Administra el stock de repuestos del taller. Permite registrar, modificar y consultar re-
puestos, actualizar el stock de forma autom ́atica al asociar repuestos a una orden de trabajo,
y generar alertas cuando el stock de un repuesto cae por debajo del umbral m ́ınimo configu-
rado.

#### 7.4.6. Servicio de Facturaci ́on

Genera documentos de facturaci ́on a partir de ́ordenes de trabajo completadas, calculando
montos netos, IVA y total. Registra los pagos recibidos, actualiza el estado de cada factura
y expone endpoints para la generaci ́on de reportes de ingresos por per ́ıodo.

#### 7.4.7. Servicio de Dashboard y Reportes

Consolida y procesa informaci ́on de m ́ultiples entidades del sistema para proveer indica-
dores clave de negocio: productividad por mec ́anico, ́ordenes por per ́ıodo, ingresos totales,
consumo de repuestos y an ́alisis de demanda. Genera reportes exportables en formato Excel
y PDF.


#### 7.4.8. Servicio de Notificaciones

Gestiona el env ́ıo de comunicaciones a los clientes, principalmente notificaciones sobre
cambios de estado en sus ́ordenes de trabajo. Puede operar mediante correo electr ́onico o
mensajer ́ıa (seg ́un la configuraci ́on del taller), y mantiene un registro de todas las notifica-
ciones enviadas.

#### 7.4.9. Servicio de IA (Chatbot + RAG)

Componente de inteligencia artificial del sistema. Implementa dos funcionalidades dife-
renciadas: el asistente t ́ecnico (para mec ́anicos), que utiliza RAG sobre la base de datos
vectorial ChromaDB para recuperar fragmentos relevantes de documentaci ́on t ́ecnica ante
cada consulta; y el chatbot de negocio (para administradores), que traduce consultas en
lenguaje natural a consultas sobre los datos operativos del taller y retorna respuestas con-
textualizadas.


## 8. Interfaces de los Componentes

A continuaci ́on se describiremos la interfaz de cada componente del sistema, especificando
sus endpoints principales, los requerimientos funcionales que satisface y los requerimientos
no funcionales que se consideran. La descripci ́on sigue las convenciones REST, como m ́etodo
HTTP, ruta, descripci ́on y observaciones relevantes.

### 8.1. Interfaces de Componentes Cliente

#### 8.1.1. Interfaz del Portal Web del Administrador

```
Tabla 15: Interfaz del Portal Web del Administrador
```
```
M ́odulo/Vista Funcionalidad expuesta RF que sa-
tisface
```
```
RNF con-
siderado
Dashboard princi-
pal
```
```
Visualizaci ́on de KPIs: ́ordenes
activas, ingresos del per ́ıodo,
mec ́anicos en trabajo
```
```
RF-011 Rendimiento,
Usabilidad
```
```
Gesti ́on de Clientes CRUD de clientes, b ́usqueda
por nombre/RUT, historial de
veh ́ıculos
```
##### RF-002, RF-

##### 012

```
Seguridad,
Usabilidad
```
```
Gesti ́on de Veh ́ıcu-
los
```
```
CRUD de veh ́ıculos, asociaci ́on
con cliente, historial de reparacio-
nes
```
##### RF-003, RF-

##### 007, RF-012

```
Usabilidad
```
```
Gesti ́on deOrdenes ́ Crear/editar/cerrar ́ordenes,
asignar mec ́anico, cambiar estado
```
##### RF-004, RF-

##### 007

```
Rendimiento,
Seguridad
Inventario Consultar stock, registrar repues-
tos, ver alertas de stock m ́ınimo
```
```
RF-008 Disponibilidad
```
```
Facturaci ́on Generar facturas, registrar pagos,
ver historial de ingresos
```
```
RF-010 Seguridad,
Rendimien-
to
Reportes Exportar reportes (Excel/PDF)
de ́ordenes, ingresos y producti-
vidad
```
```
RF-011 Rendimiento
```
```
Chatbot de Nego-
cio
```
```
Consultas en lenguaje natural so-
bre m ́etricas del taller
```
```
RF-006 Rendimiento,
Usabilidad
Configuraci ́on Par ́ametros del taller, roles y per-
misos, categor ́ıas de servicios
```
```
RF-013 Seguridad
```
```
Auditor ́ıa Consulta del registro de activida-
des del sistema
```
```
RF-014 Seguridad
```

#### 8.1.2. Interfaz del Portal Web del Mec ́anico

```
Tabla 16: Interfaz del Portal Web del Mec ́anico
```
```
M ́odulo/Vista Funcionalidad expuesta RF que sa-
tisface
```
```
RNF con-
siderado
MisOrdenes ́ Listado de ́ordenes asignadas, fil-
tro por estado y fecha
```
##### RF-004, RF-

##### 012

```
Usabilidad,
Rendimien-
to
Detalle de Orden Informaci ́on del veh ́ıculo y clien-
te, registro de diagn ́ostico y tra-
bajos realizados
```
##### RF-004, RF-

##### 007

```
Usabilidad
```
```
Repuestos de la Or-
den
```
```
Selecci ́on y registro de repuestos
utilizados en la intervenci ́on
```
```
RF-008 Disponibilidad
```
```
Asistente T ́ecnico
IA
```
```
Chat para consultas sobre ma-
nuales, c ́odigos de falla y proce-
dimientos
```
```
RF-005 Rendimiento,
Usabilidad
```
```
Historial del
Veh ́ıculo
```
```
Consulta de reparaciones anterio-
res del veh ́ıculo en atenci ́on
```
```
RF-007 Usabilidad
```
#### 8.1.3. Interfaz del Portal Web del Cliente

```
Tabla 17: Interfaz del Portal Web del Cliente
```
```
M ́odulo/Vista Funcionalidad expuesta RF que sa-
tisface
```
```
RNF con-
siderado
Consulta de estado Ingreso de patente o N° de orden
para ver estado actual de la repa-
raci ́on
```
```
RF-009 Usabilidad,
Disponibili-
dad
Historial de servi-
cios
```
```
Vista del historial de reparaciones
asociadas al veh ́ıculo
```
```
RF-007 Usabilidad
```
```
Detalle de factura Consulta del detalle y estado de
pago de la factura asociada
```
```
RF-010 Seguridad
```

### 8.2. Interfaces de Componentes Servicio (APIs REST)

Ahora detallamos los endpoints principales de cada servicio. Todos los endpoints (salvo
los de autenticaci ́on y el portal del cliente) requieren un token JWT v ́alido en el encabezado
Authorization: Bearer <token>.

#### 8.2.1. Interfaz del Servicio de Autenticaci ́on

```
Tabla 18: Endpoints – Servicio de Autenticaci ́on
```
```
M ́eto-
do
```
```
Endpoint Descripci ́on RF RNF
```
```
POST /auth/login Autenticar usuario y emitir
token JWT
```
```
RF-001 Seguridad
```
```
POST /auth/logout Invalidar token de sesi ́on ac-
tivo
```
```
RF-001 Seguridad
```
```
POST /auth/register Registrar nuevo usuario (so-
lo admin)
```
```
RF-001 Seguridad
```
```
POST /auth/recover Solicitar recuperaci ́on de
contrase ̃na
```
```
RF-001 Seguridad
```
```
GET /auth/me Obtener perfil y rol del
usuario autenticado
```
```
RF-001 Seguridad
```
```
PUT /auth/users/{id} Actualizar datos o rol de un
usuario
```
##### RF-001,

##### RF-013

```
Seguridad
```

#### 8.2.2. Interfaz del Servicio de Clientes

```
Tabla 19: Endpoints – Servicio de Clientes
```
```
M ́eto-
do
```
```
Endpoint Descripci ́on RF RNF
```
```
GET /clientes Listar clientes con filtros y
paginaci ́on
```
##### RF-002,

##### RF-012

```
Rendimiento
```
```
POST /clientes Crear nuevo cliente RF-002 Seguridad
GET /clientes/{id} Obtener datos de un cliente
espec ́ıfico
```
```
RF-002 Rendimiento
```
```
PUT /clientes/{id} Actualizar datos de contac-
to del cliente
```
```
RF-002 Seguridad
```
```
DLT /clientes/{id} Eliminar o deshabilitar
cliente
```
```
RF-002 Seguridad
```
```
GET /clientes/{id}/vehiculosObtener veh ́ıculos asociados
al cliente
```
##### RF-002,

##### RF-003

```
Rendimiento
```
```
GET /clientes/{id}/ordenes Obtener historial de ́ordenes
del cliente
```
##### RF-002,

##### RF-007

```
Rendimiento
```
#### 8.2.3. Interfaz del Servicio de Veh ́ıculos

```
Tabla 20: Endpoints – Servicio de Veh ́ıculos
```
```
M ́eto-
do
```
```
Endpoint Descripci ́on RF RNF
```
```
GET /vehiculos Listar veh ́ıculos con filtros
(patente, cliente)
```
##### RF-003,

##### RF-012

```
Rendimiento
```
```
POST /vehiculos Registrar nuevo veh ́ıculo RF-003 Seguridad
GET /vehiculos/{id} Obtener datos de un
veh ́ıculo
```
```
RF-003 Rendimiento
```
```
PUT /vehiculos/{id} Actualizar datos del
veh ́ıculo
```
```
RF-003 Seguridad
```
```
DLT /vehiculos/{id} Eliminar veh ́ıculo del siste-
ma
```
```
RF-003 Seguridad
```
```
GET /vehiculos/{id}/historialObtener historial de repa-
raciones del veh ́ıculo
```
```
RF-007 Rendimiento
```

#### 8.2.4. Interfaz del Servicio deOrdenes de Trabajo ́

```
Tabla 21: Endpoints – Servicio deOrdenes de Trabajo ́
```
```
M ́eto-
do
```
```
Endpoint Descripci ́on RF RNF
```
```
GET /ordenes Listar ́ordenes con filtros
por estado, fecha, mec ́ani-
co
```
##### RF-004,

##### RF-012

```
Rendimiento
```
```
POST /ordenes Crear nueva orden de tra-
bajo
```
```
RF-004 Seguridad
```
```
GET /ordenes/{id} Obtener detalle completo
de una orden
```
```
RF-004 Rendimiento
```
```
PUT /ordenes/{id} Actualizar diagn ́ostico, es-
tado y trabajos realizados
```
```
RF-004 Seguridad,
Rendi-
miento
PATCH /ordenes/{id}/estado Cambiar estado de la or-
den de trabajo
```
```
RF-004 Rendimiento
```
```
POST /ordenes/{id}/repuestos Asociar repuestos utiliza-
dos a la orden
```
##### RF-004,

##### RF-008

```
Seguridad
```
```
POST /ordenes/{id}/cerrar Cerrar la orden y disparar
generaci ́on de factura
```
##### RF-004,

##### RF-010

```
Seguridad
```
```
GET /ordenes/publico Consulta p ́ublica de estado
por patente u orden
```
```
RF-009 Disponibilidad
```

#### 8.2.5. Interfaz del Servicio de Inventario

```
Tabla 22: Endpoints – Servicio de Inventario
```
```
M ́eto-
do
```
```
Endpoint Descripci ́on RF RNF
```
```
GET /repuestos Listar repuestos con filtros
y paginaci ́on
```
##### RF-008,

##### RF-012

```
Rendimiento
```
```
POST /repuestos Registrar nuevo repuesto
en el inventario
```
```
RF-008 Seguridad
```
```
GET /repuestos/{id} Obtener datos de un re-
puesto
```
```
RF-008 Rendimiento
```
```
PUT /repuestos/{id} Actualizar datos o precios
del repuesto
```
```
RF-008 Seguridad
```
```
GET /repuestos/alertas Listar repuestos con stock
bajo el m ́ınimo
```
```
RF-008 Disponibilidad
```
```
PATCH /repuestos/{id}/stock Ajuste manual del stock de
un repuesto
```
```
RF-008 Seguridad
```
#### 8.2.6. Interfaz del Servicio de Facturaci ́on

```
Tabla 23: Endpoints – Servicio de Facturaci ́on
```
```
M ́eto-
do
```
```
Endpoint Descripci ́on RF RNF
```
```
POST /facturas Generar factura a partir de
una orden cerrada
```
```
RF-010 Seguridad,
Rendi-
miento
GET /facturas Listar facturas con filtros
por per ́ıodo y estado
```
##### RF-010,

##### RF-012

```
Rendimiento
```
```
GET /facturas/{id} Obtener detalle de una fac-
tura
```
```
RF-010 Rendimiento
```
```
PATCH /facturas/{id}/pago Registrar pago y actualizar
estado de la factura
```
```
RF-010 Seguridad
```
```
GET /facturas/reportes Reporte de ingresos por
per ́ıodo (JSON/Exce-
l/PDF)
```
##### RF-010,

##### RF-011

```
Rendimiento
```

#### 8.2.7. Interfaz del Servicio de Dashboard y Reportes

```
Tabla 24: Endpoints – Servicio de Dashboard y Reportes
```
```
M ́eto-
do
```
```
Endpoint Descripci ́on RF RNF
```
```
GET /dashboard/admin KPIs consolidados para el
administrador
```
```
RF-011 Rendimiento
```
```
GET /dashboard/mecanico/{idIndicadores de productivi-}
dad del mec ́anico
```
```
RF-011 Rendimiento
```
```
GET /reportes/ordenes Reporte de ́ordenes por
per ́ıodo y estado
```
```
RF-011 Rendimiento
```
```
GET /reportes/productividad Reporte de productividad
por mec ́anico
```
```
RF-011 Rendimiento
```
```
GET /reportes/repuestos Reporte de consumo de re-
puestos
```
##### RF-008,

##### RF-011

```
Rendimiento
```
#### 8.2.8. Interfaz del Servicio de Notificaciones

```
Tabla 25: Endpoints – Servicio de Notificaciones
```
```
M ́eto-
do
```
```
Endpoint Descripci ́on RF RNF
```
```
POST /notificaciones/enviar Enviar notificaci ́on a clien-
te sobre su orden
```
```
RF-009 Disponibilidad
```
```
GET /notificaciones/{idorden}Consultar historial de no-
tificaciones de una orden
```
```
RF-009 Rendimiento
```
```
POST /notificaciones/config Configurar canal y planti-
lla de notificaciones
```
```
RF-013 Seguridad
```

#### 8.2.9. Interfaz del Servicio de IA (Chatbot + RAG)

```
Tabla 26: Endpoints – Servicio de IA (Chatbot + RAG)
```
```
M ́eto-
do
```
```
Endpoint Descripci ́on RF RNF
```
```
POST /ia/tecnico/consulta Enviar consulta t ́ecnica del
mec ́anico al sistema RAG
```
```
RF-005 Rendimiento,
Usabili-
dad
GET /ia/tecnico/historial Obtener historial de con-
sultas del mec ́anico
```
```
RF-005 Rendimiento
```
```
POST /ia/negocio/consulta Enviar consulta de negocio
del administrador al chat-
bot
```
```
RF-006 Rendimiento,
Usabili-
dad
POST /ia/documentos Cargar nuevo documento
t ́ecnico al sistema RAG
```
```
RF-005 Seguridad,
Escalabi-
lidad
DELETE/ia/documentos/{id} Eliminar documento t ́ecni-
co del sistema RAG
```
```
RF-005 Seguridad
```

## 9. Conclusi ́on

El presente documento se ampl ́ıa el contexto de RepararIA, incorporando nuevas vistas
y especificaciones t ́ecnicas.
En primer lugar, se defini ́o el modelo de datos que sustenta todas las funcionalidades
del sistema, eligiendo PostgreSQL como motor relacional principal por la naturaleza tran-
saccional e interrelacionada del dominio del taller mec ́anico, complementado con ChromaDB
como base de datos vectorial para el componente RAG de inteligencia artificial. El modelo
contempla ocho entidades principales (Usuario, Cliente, Veh ́ıculo, Orden de Trabajo, Re-
puesto, Orden-Repuesto, Factura y Auditor ́ıa), cuyas relaciones garantizan la trazabilidad
completa del ciclo de vida de cada veh ́ıculo en el taller.
En segundo lugar, se formaliz ́o la estructura SOA del sistema, identificando cuatro
componentes cliente y sus nueve servicios desacoplados. Esta arquitectura, mediada por un
API Gateway, asegura la modularidad, reusabilidad e independencia de los componentes,
facilitando el mantenimiento y la incorporaci ́on de nuevas funcionalidades sin impactar los
servicios existentes.
Para las interfaces de cada componente se describen y detallan los m ́odulos de vista
para los componentes cliente y endpoints de los servicios. Satisfaciendo todos los requeri-
mientos funcionales y los atributos de calidad no funcionales.
Con estas tres nuevas dimensiones resueltas, contamos con una base m ́as que s ́olida para
avanzar hacia las etapas siguientes como implementaci ́on por ejemplo, teniendo un dise ̃no
mejor definido que permitir ́an construir RepararIA de forma ordenada, escalable y alineada
con las necesidades reales del taller mec ́anico.


