port module Todo exposing (..)
{-| TodoMVC implemented in Elm, using plain HTML and CSS for rendering.

This application is broken up into three key parts:

  1. Model  - a full definition of the application's state
  2. Update - a way to step the application state forward
  3. View   - a way to visualize our application state with HTML

This clean division of concerns is a core part of Elm. You can read more about
this in <http://guide.elm-lang.org/architecture/index.html>
-}

import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (..)
import Html.Lazy exposing (lazy, lazy2, lazy3)
import Json.Decode as Json
import String



main : Program {}
main =
  Html.program
    { init = init ! []
    , view = view
    , update = \msg model -> update msg model ! []
    , subscriptions = \_ -> Sub.none
    }



-- MODEL


-- The full application state of our todo app.
type alias Model =
    { tasks : List Task
    , field : String
    , uid : Int
    , visibility : String
    }


type alias Task =
    { description : String
    , completed : Bool
    , editing : Bool
    , id : Int
    }


newTask : String -> Int -> Task
newTask desc id =
    { description = desc
    , completed = False
    , editing = False
    , id = id
    }


emptyModel : Model
emptyModel =
    { tasks = []
    , visibility = "All"
    , field = ""
    , uid = 0
    }



-- UPDATE


{-| Users of our app can trigger messages by clicking and typing. These
messages are fed into the `update` function as they occur, letting us react
to them.
-}
type Msg
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


-- How we update our Model on a given Msg?
update : Msg -> Model -> Model
update msg model =
  case msg of
    NoOp -> model

    Add ->
      { model
        | uid = model.uid + 1
        , field = ""
        , tasks =
            if String.isEmpty model.field then
              model.tasks
            else
              model.tasks ++ [newTask model.field model.uid]
      }

    UpdateField str ->
      { model | field = str }

    EditingTask id isEditing ->
      let
        updateTask t =
          if t.id == id then { t | editing = isEditing } else t
      in
        { model | tasks = List.map updateTask model.tasks }

    UpdateTask id task ->
      let
        updateTask t =
          if t.id == id then { t | description = task } else t
      in
        { model | tasks = List.map updateTask model.tasks }

    Delete id ->
      { model | tasks = List.filter (\t -> t.id /= id) model.tasks }

    DeleteComplete ->
      { model | tasks = List.filter (not << .completed) model.tasks }

    Check id isCompleted ->
      let
        updateTask t =
          if t.id == id then { t | completed = isCompleted } else t
      in
        { model | tasks = List.map updateTask model.tasks }

    CheckAll isCompleted ->
      let
        updateTask t =
          { t | completed = isCompleted }
      in
        { model | tasks = List.map updateTask model.tasks }

    ChangeVisibility visibility ->
      { model | visibility = visibility }



-- VIEW


view : Model -> Html Msg
view model =
  div
    [ class "todomvc-wrapper"
    , style [ ("visibility", "hidden") ]
    ]
    [ section
        [ id "todoapp" ]
        [ lazy2 taskEntry model.field
        , lazy3 taskList model.visibility model.tasks
        , lazy3 controls model.visibility model.tasks
        ]
    , infoFooter
    ]


onEnter : msg -> Attribute msg
onEnter value =
  on "keydown"
    (Json.customDecoder keyCode is13)
    (\_ -> Signal.message value)


is13 : Int -> Result String ()
is13 code =
  if code == 13 then Ok () else Err "not the right key code"


taskEntry : String -> Html Msg
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
        , on "input" targetValue (Signal.message << UpdateField)
        , onEnter Add
        ]
        []
    ]


taskList : String -> List Task -> Html Msg
taskList visibility tasks =
  let
    isVisible todo =
      case visibility of
        "Completed" -> todo.completed
        "Active" -> not todo.completed
        _ -> True

    allCompleted =
      List.all .completed tasks

    cssVisibility =
      if List.isEmpty tasks then "hidden" else "visible"
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
          , onClick (CheckAll (not allCompleted))
          ]
          []
      , label
          [ for "toggle-all" ]
          [ text "Mark all as complete" ]
      , ul
          [ id "todo-list" ]
          (List.map (todoItem) (List.filter isVisible tasks))
      ]


todoItem : Task -> Html Msg
todoItem todo =
  li
    [ classList [ ("completed", todo.completed), ("editing", todo.editing) ] ]
    [ div
        [ class "view" ]
        [ input
            [ class "toggle"
            , type' "checkbox"
            , checked todo.completed
            , onClick (Check todo.id (not todo.completed))
            ]
            []
        , label
            [ onDoubleClick (EditingTask todo.id True) ]
            [ text todo.description ]
        , button
            [ class "destroy"
            , onClick (Delete todo.id)
            ]
            []
        ]
    , input
        [ class "edit"
        , value todo.description
        , name "title"
        , id ("todo-" ++ toString todo.id)
        , on "input" targetValue (Signal.message << UpdateTask todo.id)
        , onBlur (EditingTask todo.id False)
        , onEnter (EditingTask todo.id False)
        ]
        []
    ]


controls : String -> List Task -> Html Msg
controls visibility tasks =
  let
    tasksCompleted =
      List.length (List.filter .completed tasks)

    tasksLeft =
      List.length tasks - tasksCompleted

    item_ =
      if tasksLeft == 1 then " item" else " items"
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
          , onClick DeleteComplete
          ]
          [ text ("Clear completed (" ++ toString tasksCompleted ++ ")") ]
      ]


visibilitySwap : String -> String -> String -> Html Msg
visibilitySwap uri visibility actualVisibility =
  li
    [ onClick (ChangeVisibility visibility) ]
    [ a [ href uri, classList [("selected", visibility == actualVisibility)] ]
        [ text visibility ]
    ]


infoFooter : Html
infoFooter =
  footer [ id "info" ]
    [ p [] [ text "Double-click to edit a todo" ]
    , p []
        [ text "Written by "
        , a [ href "https://github.com/evancz" ] [ text "Evan Czaplicki" ]
        ]
    , p []
        [ text "Part of "
        , a [ href "http://todomvc.com" ] [ text "TodoMVC" ]
        ]
    ]



-- PORTS


port focus : Signal String
port focus =
    let needsFocus act =
            case act of
              EditingTask id bool -> bool
              _ -> False

        toSelector act =
            case act of
              EditingTask id _ -> "#todo-" ++ toString id
              _ -> ""
    in
        msgs.signal
          |> Signal.filter needsFocus (EditingTask 0 True)
          |> Signal.map toSelector


-- intermsgs with localStorage to save the model
port getStorage : Maybe Model

port setStorage : Signal Model
port setStorage = model
