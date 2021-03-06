---
title: 'TDD en el front 2'
subtitle: 'El primer test unitario'
coverImage: '/assets/blog/js.svg'
date: '2022-02-14'
collection: 'TDD en el front'
---

### Contenido del Post

# TDD en el front

En el post anterior montamos todo el sistema necesario para poder tener test de aceptaci贸n, que son externos a la aplicaci贸n. 驴Sabes una ventaja de tener tests externos? Que podemos cambiar tooodo lo que queramos que si los tests siguen en verde, no hemos roto nada. Suponiendo que los tests son los adecuados claro 馃槄.

Y es justo lo primero que vamos a hacer, he decidido usar React para esta prueba asi que 隆a montar nuestra app!

> **Aviso** - esto es m谩s un cuaderno de notas que una serie de art铆culos rigurosos. No esperes largas explicaciones o justificaciones sobre cada decisi贸n tomada, estoy en modo experimentaci贸n 馃槄.

# Primer gran refactor

Vamos a empezar de nuevo, esta vez creando nuestra aplicaci贸n con create-react-app:

```bash
npx create-react-app atdd-en-el-front
```

Volvemos a seguir r谩pidamente el post anterior para dejarlo todo configurado. Instalamos cypress:

```bash
npm i cypress cypress-cucumber-preprocessor
npx cypress open
```

Decimos que queremos borrar los archivos y configuramos el plugin:

_cypress/plugins/index.js_

```javascript
const cucumber = require('cypress-cucumber-preprocessor').default;

module.exports = (on, config) => {
  on('file:preprocessor', cucumber());
};
```

_cypress.json_

```json
{
  "testFiles": "**/*.feature",
  "screenshotOnRunFailure": false,
  "video": false
}
```

_package.json_

```json
"cypress-cucumber-preprocessor": {
  "nonGlobalStepDefinitions": true
}
```

Recuperamos los steps y hacemos un peque帽o cambio, el puerto de acceso a la app, ahora nuestro server va en el 3000:

_cypress/integration/AddMovie/steps.js_

```js
/* eslint-disable no-undef */
/// <reference types="Cypress" />
import { Given, Then, When } from 'cypress-cucumber-preprocessor/steps';

Given('I have no movies in my list', () => {});

When('I visit the site', () => {
  cy.visit('http://localhost:3000/');
});

Then('I see an empty list', () => {
  cy.contains('No movies in your list');
});
```

Recuperamos nuestra feature:

_cypress/integration/AddMovie.feature_

```gherkin
Feature: Add Movie to the list
  As a User
  I want to add movies to a list
  So that I can track the movies I've seen

  Scenario: Empty movies list
    Given I have no movies in my list
    When I visit the site
    Then I see an empty list
```

Ahora podemos lanzar el server:

```bash
npm start
```

Y tirar los tests:

```bash
npx cypress run
```

El test falla en el tercer paso porque no encuentra el contenido, modificamos App.js:

_src/App.js_

```js
import './App.css';

function App() {
  return <div>No movies in your list</div>;
}

export default App;
```

Y ya tenemos, gracias a la magia de los tests, la certeza de que lo que funcionaba en nuestro anterior proyecto, funciona en este.

# Automatizar el server para los test de aceptaci贸n

Vamos a mejorar un poco nuestro tooling para no tener que estar lanzando manualmente el servidor de desarrollo. Para ello instalamos un par de utilidades:

```bash
npm i concurrently wait-on
```

Y a帽adimos unos cuantos scripts a nuestro package.json

```json
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject",
    "pretest:cypress": "wait-on -t 30000 http-get://localhost:3000",
    "test:cypress": "npx cypress run",
    "test:e2e": "concurrently -p none -k --hide 0 -s first 'BROWSER=none npm start' 'npm run test:cypress'"
  },
```

Vamos por partes. El primero es un viejo conocido ya, lanzar cypress:

```bash
"test:cypress": "npx cypress run",
```

A帽adiendo el prefijo _pre_ al script anterior autom谩ticamente se lanza este comando antes. Esperamos a que haya respuesta en la url de testing antes de lanzar cypress, hacemos esto para evitar timeouts.

```bash
"pretest:cypress": "wait-on -t 30000 http-get://localhost:3000",
```

Por 煤ltimo el comando de testing lanza simultaneamente el servidor y cypress (que se espera a que el servidor arranque con el _pre_).

```bash
"test:e2e": "concurrently -p none -k --hide 0 -s first 'BROWSER=none npm start' 'npm run test:cypress'"
```

- _-p none_ quita decoraci贸n.
- _-k_ mata todos los procesos en cuanto el primero acabe (el server nunca acaba, el primero suempre es cypress)
- _--hide 0_ oculta el output del primer comando, el servidor
- _-s first_ hace que la salida, success o failure, del comando global sea la del primer subcomando que termine (la salida de concurrently ser谩 la de cypress)

Pues listo, ahora podemos tirar los tests de aceptaci贸n con:

```bash
npm run test:e2e
```

Y todo deber铆a seguir en verde.

# El segundo escenario

Continuamos con nuestra feature. Vamos con el siguiente escenario, a帽adir una pel铆cula a una lista vac铆a:

_AddMovie.feature_

```gherkin
  Scenario: Add a movie to empty list
    Given I have no movies in my list
    When I visit the site
    And I add a movie with name "Matrix"
    Then I see a list with:
      | id | Name   |
      | 1  | Matrix |
```

Si lanzamos los tests vemos que los dos que ya ten铆amos hechos pasan y que nos pide implementar el tercero:

```bash
Error: Step implementation missing for: I add a movie with name "Matrix"
```

A帽adimos el step a nuestro archivo, teniendo en cuenta que el nombre de la pel铆cula es un par谩metro. Vamos a empezar con una implementaci贸n sencilla y luego veremos si podemos mejorarla:

```js
When('I add a movie with name {string}', (movieName) => {
  cy.get('input[id=name]').type(movieName);
  cy.get('button[type=submit]').click();
});
```

Si ahora ejecutamos el test falla, que sorpresa 馃槄

```bash
AssertionError: Timed out retrying after 4000ms: Expected to find element: `input[id=name]`, but never found it.
```

Ahora es cuando tenemos que implementar la funcionalidad, y pasamos de "ser usuarios" a ser programadores.

# TDD

Lo primero que hay que decidir antes de hacer test unitarios es cual va ser nuestra unidad. Voy a empezar dividiendo la app en dos capas, voy a dejar App.js como coordinador (algo asi como capa de infraestructura en t茅rminos de Hexagonal), y voy a tener una primera capa de componentes que van a actuar de Servicios de Aplicaci贸n o Casos de Uso.

Esta capa es la que voy a testear, dejando la coordinaci贸n entre casos de uso a los test de aceptaci贸n. Como regla general si lo que voy a testear ocurre solo dentro de un componente uso unitarios (loaders, errores, empty states...) y si quiero testear la interacci贸n entre componentes uso los de aceptaci贸n (si hago submit aqui aparece esto all铆).

Vamos a verlo con el primer ejemplo, voy a tener un componente para el formulario de a帽adir pel铆culas:

```bash
src
鈹溾攢鈹? Components
鈹?   鈹斺攢鈹? AddMovieForm.js
鈹?   鈹斺攢鈹? AddMovieForm.test.js
鈹斺攢鈹? App.js
```

y en AddMovieForm.test.js creo mi primer test

```js
import { render } from '@testing-library/react';

test('should render', () => {
  render(<AddMovieForm />);
});
```

Create react app ya nos ha instalado todo lo necesario para correr los tests, jest y testing-library,

Para lanzarlo primero hacemos un peque帽o cambio en el package.json, evitando que se quede en modo watch (para cuando desarrolles de verdad, el modo watch es maravilloso):

```json
"test": "react-scripts test --watchAll=false",
```

Y ahora si, lanzamos el test:

```bash
npm t
```

Vemos el error:

```bash
ReferenceError: AddMovieForm is not defined
```

Y creamos el archivo necesario para hacerlo pasar

_src/Components/AddMovieForm.js_

```js
const AddMovieForm = () => {
  return <></>;
};

export default AddMovieForm;
```

馃煝 Tenemos el test en verde 馃憦

```bash
 PASS  src/Components/AddMovieForm.test.js
  鉁? should render (7 ms)
```

A partir de ahora entramos en un ciclo de TDD cl谩sico donde vamos poco a poco modelando la funcionalidad de nuestro componente teniendo en cuenta todos esos casos posibles como loaders o errores.

Empezamos con el input, queremos que al comenzar a usar el form no se muestre ning煤n error:

```js
test('Hides name required message on start', () => {
  render(<AddMovieForm />);

  expect(screen.queryByText('El nombre es obligatorio')).toBeNull();
});
```

Resolvemos el test con el menor c贸digo posible, en este caso no hay que escribir c贸digo 馃槄. Comprobamos ahora que si hacemos submit sin tocar el input nos muestra el error:

```js
test('Shows name required message on bad submit', () => {
  render(<AddMovieForm />);

  const button = screen.getByRole('button', { name: 'A帽adir pel铆cula' });
  userEvent.click(button);

  expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument();
});
```

De nuevo escribimos el c贸digo necesario para que el test pase:

```js
const AddMovieForm = () => {
  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <div>El nombre es obligatorio</div>
      <button type="submit">A帽adir pel铆cula</button>
    </form>
  );
};
```

馃敶 隆Pero ahora falla el primer test! Tenemos que a帽adir algo para conseguir que los dos queden en verde:

```js
const AddMovieForm = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleForm = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <form onSubmit={handleForm}>
      {submitted && <div>El nombre es obligatorio</div>}
      <button type="submit">A帽adir pel铆cula</button>
    </form>
  );
};
```

Observa que todav铆a no hemos a帽adido el input, solo el c贸digo necesario para hacer pasar el test. Vamos ahora a comprobar que si escribimos en el input, el error desaparece:

```js
test('Hides name required message on correct submit', () => {
  render(<AddMovieForm />);

  const name = screen.getByLabelText('Nombre');
  userEvent.type(name, 'Matrix');

  const button = screen.getByRole('button', { name: 'A帽adir pel铆cula' });
  userEvent.click(button);

  expect(screen.queryByText('El nombre es obligatorio')).toBeNull();
});
```

Y como siempre, lo hacemos pasar:

```js
const AddMovieForm = () => {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');

  const handleForm = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <form onSubmit={handleForm}>
      <label htmlFor="name">Nombre</label>
      <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
      {submitted && !name && <div>El nombre es obligatorio</div>}
      <button type="submit">A帽adir pel铆cula</button>
    </form>
  );
};
```

Podr铆amos ahora a帽adir casos como escribir en el input y borrarlo para comprobar que el error aparece y desaparece tras cambios de estado pero por ahora creo que vamos bien cubiertos.

Ahora toda lanzar el test de aceptaci贸n para ver que hemos completado el segundo step:

```bash
Error: Step implementation missing for: I see a list with:
```

脡xito, ahora nos pide que implementemos el tercer step pero aaaantes...隆a refactorizar!

# Refactorizando

No podemos olvidarnos de que el ciclo de TDD es Red, Green y Refactor. Aprovechamos la situaci贸n de "estabilidad" para mejorar un poco la legibilidad de los test y eliminar el primer test que es redundante.

```js
const NAME_REQUIRED = "El nombre es obligatorio";

test("Hides name required message on start", () => {
  givenTheComponentIsRendered();
  expect(screen.queryByText(NAME_REQUIRED)).toBeNull();
});

test("Shows name required message on bad submit", () => {
  givenTheComponentIsRendered();

  whenFormIsSubmitted();

  expect(screen.getByText(NAME_REQUIRED)).toBeInTheDocument();
});

test("Hides name required message on correct submit", () => {
  givenTheComponentIsRendered();

  whenFormIsCorrect();
  whenFormIsSubmitted();

  expect(screen.queryByText(NAME_REQUIRED)).toBeNull();
});

function givenTheComponentIsRendered() {
  render(<AddMovieForm />);
}

function whenFormIsSubmitted() {
  const button = screen.getByRole("button", { name: "A帽adir pel铆cula" });
  userEvent.click(button);
}

function whenFormIsCorrect() {
  const name = screen.getByLabelText("Nombre");
  userEvent.type(name, "Matrix");
}
}
```

Con _givenTheComponentIsRendered_ podremos ir a帽adiendo dependencias en un punto com煤n y con _whenFormIsCorrect_ podremos ir ampliando el formulario sin romper todos los tests que dependen de que el form sea correcto.

Y f铆jate que en el componente podr铆amos ahora usar Formik o React Hook Form y los tests nos asegurar铆an que no rompemos nada (en un proyecto real usar铆a estas librer铆as desde el principio claro).

# Fin del segundo post

隆Pfiu! Hemos visto c贸mo los test de aceptaci贸n nos ayudan a hacer grandes cambios, luego los hemos automatizado para no tener que andar levantando el server de desarrollo manualmente.

Por 煤ltimo hemos completado el segundo step mediante ciclos de TDD, creando nuestro primer componente.

驴Y la llamada a la API? 驴Y el tercer step? 隆En el siguiente post!

Tienes el c贸digo del proyecto [en este enlace](https://github.com/albertobeiz/tdd-en-el-front) y puedes hacerme cualquier pregunta o comentario por [dm en Twitter](https://twitter.com/albertobeiz).
