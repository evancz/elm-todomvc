# TodoMVC in Elm - [Try It!](https://evancz.github.io/elm-todomvc)

All of the Elm code lives in `src/Main.elm` and relies on the [elm/html][html] library.

[html]: https://package.elm-lang.org/packages/elm/html/latest

There also is a port handler set up in `index.html` to store the Elm application's state in `localStorage` on every update.


## Build Instructions

Run the following command from the root of this project:

```bash
elm make src/Main.elm --output=elm.js
```

Then open `index.html` in your browser!

### If you are using elm reactor to run your project, then consider these revisions:

(a) Add flags with the value null:
    `var app = Elm.Main.init({ node: document.getElementById("elm"), flags: null});`

The object that is passed to flags is going to be the input argument for the init function. Since the init function expects a Maybe Model, you can pass in a JSON object representing an entire model: 
     `{ entries: [{description:"Hello!", completed:true, editing:false, id:13}], visibility: "All", field: "", uid: 0}`

(b) Add styles:

Add a html link reference in the header to the included style.css file:
    `<link rel="stylesheet" type="text/css" href="style.css">`

