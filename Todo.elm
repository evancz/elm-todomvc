module Todo where
{-| TodoMVC implemented in Elm, using plain HTML and CSS for rendering.

This application is broken up into four distinct parts:

  1. Model  - a full definition of the application's state
  2. Update - a way to step the application state forward
  3. View   - a way to visualize our application state with HTML
  4. Inputs - the signals necessary to manage events

This clean division of concerns is a core part of Elm. You can read more about
this in the Pong tutorial: http://elm-lang.org/blog/Pong.elm

This program is not particularly large, so definitely see the following
document for notes on structuring more complex GUIs with Elm:
https://gist.github.com/evancz/2b2ba366cae1887fe621
-}

import Graphics.Element (Element, container, midTop)
import Html (..)
import Html.Attributes (..)
import Html.Events (..)
import Html.Lazy (lazy, lazy2)
import Json.Decode as Json
import List
import Maybe
import Signal
import String
import Window


---- MODEL ----

-- The full application state of our todo app.
type alias State =
    { tasks      : List Task
    , field      : String
    , uid        : Int
    , visibility : String
    }

type alias Task =
    { description : String
    , completed   : Bool
    , editing     : Bool
    , id          : Int
    }

newTask : String -> Int -> Task
newTask desc id =
    { description = desc
    , completed = False 
    , editing = False
    , id = id
    }

emptyState : State
emptyState =
    { tasks = []
    , visibility = "All"
    , field = ""
    , uid = 0
    }


---- UPDATE ----

-- A description of the kinds of updates that can be performed on the state of
-- the application. See the following post for more info on this pattern and
-- some alternatives: https://gist.github.com/evancz/2b2ba366cae1887fe621
type Update
    = NoOp
    | UpdateField String
    | EditingTask Int Bool
    | UpdateTask Int String
    | Add
    | Delete Int
    | DeleteComplete
    | Check Int Bool
    | CheckAll Bool
    | ChangeVisibility String

-- How we step the state forward for any given update
step : Update -> State -> State
step update state =
    case update of
      NoOp -> state

      Add ->
          { state | uid <- state.uid + 1
                  , field <- ""
                  , tasks <- if String.isEmpty state.field
                               then state.tasks
                               else state.tasks ++ [newTask state.field state.uid]
          }

      UpdateField str ->
          { state | field <- str }

      EditingTask id isEditing ->
          let stepTask t = if t.id == id then { t | editing <- isEditing } else t
          in  { state | tasks <- List.map stepTask state.tasks }

      UpdateTask id task ->
          let stepTask t = if t.id == id then { t | description <- task } else t
          in  { state | tasks <- List.map stepTask state.tasks }

      Delete id ->
          { state | tasks <- List.filter (\t -> t.id /= id) state.tasks }

      DeleteComplete ->
          { state | tasks <- List.filter (not << .completed) state.tasks }

      Check id isCompleted ->
          let stepTask t = if t.id == id then { t | completed <- isCompleted } else t
          in  { state | tasks <- List.map stepTask state.tasks }

      CheckAll isCompleted ->
          let stepTask t = { t | completed <- isCompleted } in
          { state | tasks <- List.map stepTask state.tasks }

      ChangeVisibility visibility ->
          { state | visibility <- visibility }


---- VIEW ----

view : State -> Html
view state =
    div
      [ class "todomvc-wrapper"
      , style [ ("visibility", "hidden") ]
      ]
      [ section
          [ id "todoapp" ]
          [ lazy taskEntry state.field
          , lazy2 taskList state.visibility state.tasks
          , lazy2 controls state.visibility state.tasks
          ]
      , infoFooter
      ]

onEnter : Signal.Message -> Attribute
onEnter message =
    on "keydown"
      (Json.customDecoder keyCode is13)
      (always message)

is13 : Int -> Result String ()
is13 code =
  if code == 13 then Ok () else Err "not the right key code"

taskEntry : String -> Html
taskEntry task =
    header 
      [ id "header" ]
      [ h1 [] [ text "todos" ]
      , input
          [ id "new-todo"
          , placeholder "What needs to be done?"
          , autofocus True
          , value task
          , name "newTodo"
          , on "input" targetValue (Signal.send updates << UpdateField)
          , onEnter (Signal.send updates Add)
          ]
          []
      ]

taskList : String -> List Task -> Html
taskList visibility tasks =
    let isVisible todo =
            case visibility of
              "Completed" -> todo.completed
              "Active" -> not todo.completed
              "All" -> True

        allCompleted = List.all .completed tasks

        cssVisibility = if List.isEmpty tasks then "hidden" else "visible"
    in
    section
      [ id "main"
      , style [ ("visibility", cssVisibility) ]
      ]
      [ input
          [ id "toggle-all"
          , type' "checkbox"
          , name "toggle"
          , checked allCompleted
          , onClick (Signal.send updates (CheckAll (not allCompleted)))
          ]
          []
      , label
          [ for "toggle-all" ]
          [ text "Mark all as complete" ]
      , ul
          [ id "todo-list" ]
          (List.map todoItem (List.filter isVisible tasks))
      ]

todoItem : Task -> Html
todoItem todo =
    let className = (if todo.completed then "completed " else "") ++
                    (if todo.editing   then "editing"    else "")
    in

    li
      [ class className ]
      [ div
          [ class "view" ]
          [ input
              [ class "toggle"
              , type' "checkbox"
              , checked todo.completed
              , onClick (Signal.send updates (Check todo.id (not todo.completed)))
              ]
              []
          , label
              [ onDoubleClick (Signal.send updates (EditingTask todo.id True)) ]
              [ text todo.description ]
          , button
              [ class "destroy"
              , onClick (Signal.send updates (Delete todo.id))
              ]
              []
          ]
      , input
          [ class "edit"
          , value todo.description
          , name "title"
          , id ("todo-" ++ toString todo.id)
          , on "input" targetValue (Signal.send updates << UpdateTask todo.id)
          , onBlur (Signal.send updates (EditingTask todo.id False))
          , onEnter (Signal.send updates (EditingTask todo.id False))
          ]
          []
      ]

controls : String -> List Task -> Html
controls visibility tasks =
    let tasksCompleted = List.length (List.filter .completed tasks)
        tasksLeft = List.length tasks - tasksCompleted
        item_ = if tasksLeft == 1 then " item" else " items"
    in
    footer
      [ id "footer"
      , hidden (List.isEmpty tasks)
      ]
      [ span
          [ id "todo-count" ]
          [ strong [] [ text (toString tasksLeft) ]
          , text (item_ ++ " left")
          ]
      , ul
          [ id "filters" ]
          [ visibilitySwap "#/" "All" visibility
          , text " "
          , visibilitySwap "#/active" "Active" visibility
          , text " "
          , visibilitySwap "#/completed" "Completed" visibility
          ]
      , button
          [ class "clear-completed"
          , id "clear-completed"
          , hidden (tasksCompleted == 0)
          , onClick (Signal.send updates DeleteComplete)
          ]
          [ text ("Clear completed (" ++ toString tasksCompleted ++ ")") ]
      ]

visibilitySwap : String -> String -> String -> Html
visibilitySwap uri visibility actualVisibility =
    let className = if visibility == actualVisibility then "selected" else "" in
    li
      [ onClick (Signal.send updates (ChangeVisibility visibility)) ]
      [ a [ class className, href uri ] [ text visibility ] ]

infoFooter : Html
infoFooter =
    footer [ id "info" ]
      [ p [] [ text "Double-click to edit a todo" ]
      , p [] [ text "Written by "
             , a [ href "https://github.com/evancz" ] [ text "Evan Czaplicki" ]
             ]
      , p [] [ text "Part of "
             , a [ href "http://todomvc.com" ] [ text "TodoMVC" ]
             ]
      ]


---- INPUTS ----

-- wire the entire application together
main : Signal Element
main = Signal.map2 scene state Window.dimensions

scene : State -> (Int,Int) -> Element
scene state (w,h) =
    container w h midTop (toElement 550 h (view state))

-- manage the state of our application over time
state : Signal State
state = Signal.foldp step startingState (Signal.subscribe updates)

startingState : State
startingState =
  Maybe.withDefault emptyState getStorage

-- updates from user input
updates : Signal.Channel Update
updates = Signal.channel NoOp

port focus : Signal String
port focus =
    let needsFocus act =
            case act of
              EditingTask id bool -> bool
              _ -> False

        toSelector (EditingTask id _) = ("#todo-" ++ toString id)
    in
        Signal.subscribe updates
          |> Signal.keepIf needsFocus (EditingTask 0 True)
          |> Signal.map toSelector


-- interactions with localStorage to save app state
port getStorage : Maybe State

port setStorage : Signal State
port setStorage = state
