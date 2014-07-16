# TodoMVC in Elm - [Try It!](http://evancz.github.io/elm-todomvc)

## Project Structure

All of the Elm code lives in `Todo.elm` and relies on the [elm-html][] library. 

[elm-html]: http://library.elm-lang.org/catalog/evancz-elm-html/latest 

There also is a port handler set up in `index.html` to set the focus on
particular text fields when necessary.

## Build Instructions

Run the following commands from the root of this project:

```bash
elm-get install
elm --make --only-js Todo.elm
```

Then open `index.html` in your browser!
