import String
import Html
import Html (..)
import Html.Events (..)
import Html.Optimize.RefEq as Ref
import Window

import Graphics.Input (..)
import Graphics.Input as Input

data Route = All | Completed | Active

type Todo =
    { completed : Bool
    , editing : Bool
    , title : String
    , id : Int
    }

type State =
    { todos : [Todo]
    , route : Route
    , field : String
    , guid  : Int
    }

actions : Input Action
actions = Input.input NoOp

port focus : Signal String
port focus =
    let needsFocus act =
            case act of
              EditingTask id bool -> bool
              _ -> False

        toSelector (EditingTask id _) = ("#todo-" ++ show id)
    in
        toSelector <~ keepIf needsFocus (EditingTask 0 True) actions.signal

data Action
    = NoOp
    | UpdateField String

    | EditingTask Int Bool
    | UpdateTask Int String

    | Add
    | Delete Int
    | DeleteComplete
    | Check Int Bool
    | CheckAll Bool
    | ChangeRoute Route

step : Action -> State -> State
step action state =
    case action of
      NoOp -> state

      Add ->
          let newTodo = Todo False False state.field state.guid
              newItems = if String.isEmpty state.field then [] else [newTodo]
          in
              { state | todos <- state.todos ++ newItems
                      , guid <- state.guid + 1
                      , field <- ""
              }

      UpdateField str ->
          { state | field <- str }

      EditingTask id isEditing ->
          let update t = if t.id == id then { t | editing <- isEditing } else t
          in  { state | todos <- map update state.todos }

      UpdateTask id task ->
          let update t = if t.id == id then { t | title <- task } else t
          in  { state | todos <- map update state.todos }

      Delete id ->
          { state | todos <- filter (\t -> t.id /= id) state.todos }

      DeleteComplete ->
          { state | todos <- filter (not . .completed) state.todos }

      Check id isCompleted ->
          let update t = if t.id == id then { t | completed <- isCompleted } else t
          in  { state | todos <- map update state.todos }

      CheckAll isCompleted ->
          let update t = { t | completed <- isCompleted } in
          { state | todos <- map update state.todos }

      ChangeRoute route ->
          { state | route <- route }

state : State
state =
    { todos = []
    , route = All
    , field = ""
    , guid = 0
    }

main = lift2 scene (foldp step state actions.signal) Window.dimensions

scene state (w,h) =
    container w h midTop (Html.toElement 550 h (render state))

render : State -> Html
render state =
    node "div"
      [ "className" := "todomvc-wrapper" ]
      [ "visibility" := "hidden" ]
      [ node "section"
          [ "id" := "todoapp" ]
          []
          [ Ref.lazy header state.field
          , Ref.lazy2 mainSection state.route state.todos
          , Ref.lazy2 statsSection state.route state.todos
          ]
      , infoFooter
      ]

onEnter : Handle a -> a -> EventListener
onEnter handle value =
    on "keydown" (when (\k -> k.keyCode == 13) getKeyboardEvent) handle (always value)

header : String -> Html
header value =
    node "header" 
      [ "id" := "header" ]
      []
      [ node "h1" [] [] [ text "todos" ]
      , eventNode "input"
          [ "id"          := "new-todo"
          , "placeholder" := "What needs to be done?"
          , "autofocus"   := "true"
          , "value"       := value
          , "name"        := "newTodo"
          ]
          []
          [ on "input" getValue actions.handle UpdateField
          , onEnter actions.handle Add
          ]
          []
      ]

mainSection : Route -> [Todo] -> Html
mainSection route todos =
    let isVisible todo =
            case route of
              Completed -> todo.completed
              Active -> not todo.completed
              All -> True

        allCompleted = all .completed todos
    in
    node "section"
      [ "id" := "main" ]
      [ "visibility" := if isEmpty todos then "hidden" else "visible" ]
      [ eventNode "input"
          [ "id" := "toggle-all"
          , "type" := "checkbox"
          , "name" := "toggle"
          , bool "checked" allCompleted
          ]
          []
          [ onclick actions.handle (\_ -> CheckAll (not allCompleted)) ]
          []
      , node "label"
          [ "htmlFor" := "toggle-all" ]
          []
          [ text "Mark all as complete" ]
      , node "ul"
          [ "id" := "todo-list" ]
          []
          (map todoItem (filter isVisible todos))
      ]

todoItem : Todo -> Html
todoItem todo =
    let className = (if todo.completed then "completed " else "") ++
                    (if todo.editing   then "editing"    else "")
    in

    node "li" [ "className" := className ] []
      [ node "div" [ "className" := "view" ] []
          [ eventNode "input"
              [ "className" := "toggle"
              , "type" := "checkbox"
              , bool "checked" todo.completed
              ]
              []
              [ onclick actions.handle (\_ -> Check todo.id (not todo.completed)) ]
              []
          , eventNode "label" [] []
              [ ondblclick actions.handle (\_ -> EditingTask todo.id True) ]
              [ text todo.title ]
          , eventNode "button" [ "className" := "destroy" ] []
              [ onclick actions.handle (always (Delete todo.id)) ] []

          ]
      , eventNode "input"
          [ "className" := "edit"
          , "value" := todo.title
          , "name" := "title"
          , "id" := ("todo-" ++ show todo.id)
          ]
          []
          [ on "input" getValue actions.handle (UpdateTask todo.id)
          , onblur actions.handle (EditingTask todo.id False)
          , onEnter actions.handle (EditingTask todo.id False)
          ]
          []
      ]

statsSection : Route -> [Todo] -> Html
statsSection route todos =
    let todosCompleted = length (filter .completed todos)
        todosLeft = length todos - todosCompleted
    in
    node "footer" [ "id" := "footer", bool "hidden" (isEmpty todos) ] []
      [ node "span" [ "id" := "todo-count" ] []
          [ node "strong" [] [] [ text (show todosLeft) ]
          , let item_ = if todosLeft == 1 then " item" else " items"
            in  text (item_ ++ " left")
          ]
      , node "ul" [ "id" := "filters" ] []
          [ routeSwap "#/"          All       route
          , text " "
          , routeSwap "#/active"    Active    route
          , text " "
          , routeSwap "#/completed" Completed route
          ]
      , eventNode "button"
          [ "className" := "clear-completed"
          , "id" := "clear-completed"
          , bool "hidden" (todosCompleted == 0)
          ]
          []
          [ onclick actions.handle (always DeleteComplete) ]
          [ text ("Clear completed (" ++ show todosCompleted ++ ")") ]
      ]

routeSwap : String -> Route -> Route -> Html
routeSwap uri route actualRoute =
    let className = if route == actualRoute then "selected" else "" in
    eventNode "li" [] []
      [ onclick actions.handle (always (ChangeRoute route)) ]
      [ node "a" [ "className" := className, "href" := uri ] [] [ text (show route) ]
      ]

infoFooter : Html
infoFooter =
    node "footer" [ "id" := "info" ] []
      [ node "p" [] []
          [ text "Double-click to edit a todo"
          ]
      , node "p" [] []
          [ text "Written by "
          , node "a" [ "href" := "https://github.com/evancz" ] [] [ text "Evan Czaplicki" ]
          ]
      , node "p" [] []
          [ text "Part of "
          , node "a" [ "href" := "http://todomvc.com" ] [] [ text "TodoMVC" ]
          ]
      ]