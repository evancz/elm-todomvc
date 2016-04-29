# TodoMVC in Elm - [Try It!](http://evancz.github.io/elm-todomvc)

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

## Project Structure

All of the Elm code lives in `Todo.elm` and relies on the [elm-html][] library. 

[elm-html]: http://package.elm-lang.org/packages/evancz/elm-html/latest 

There also is a port handler set up in `index.html` to set the focus on
particular text fields when necessary.

## Build Instructions

Run the following command from the root of this project:

```bash
elm-make Todo.elm --output elm.js
```

Then open `index.html` in your browser!


## Troubleshooting

	Port Error:

	No argument was given for the port named 'getStorage' with type:

	    Maybe.Maybe Todo.Model

	You need to provide an initial value!

	Find out more about ports here <http://elm-lang.org/learn/Ports.elm>

	Open the developer console for more details.


- Because `todomvc` uses ports, it won't work when looking at `Todo.elm` or `index.html` through the `elm-reactor`. 

- Instead, browse to the `index.html` file in the project folder and double click on it to launch it within the browser directly. 
