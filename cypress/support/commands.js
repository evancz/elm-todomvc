// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

Cypress.Commands.add('startSeeded', () => {
  // Load todos from a fixture in ../fixtures/todo_state.json
  cy.fixture('todo_state').then(state => {
    cy.visit('index.html', {
      onBeforeLoad: function(win) {
        win.localStorage.setItem('elm-todo-save', JSON.stringify(state))
      }
    })
  })
})
