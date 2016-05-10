# TodoMVC in Elm - [Try It!](http://evancz.github.io/elm-todomvc)

All of the Elm code lives in `Todo.elm` and relies on the [elm-lang/html][html] library. 

[html]: http://package.elm-lang.org/packages/elm-lang/html/latest 

There also is a port handler set up in `index.html` to set the focus on particular text fields when necessary.


## Build Instructions

Run the following command from the root of this project:

```bash
elm-make Todo.elm --output elm.js
```

Then open `index.html` in your browser!
