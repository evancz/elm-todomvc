describe('Editing todos', function() {
  beforeEach(function() {
    /**
     * `startSeeded` is a custom command that starts the app with seed data.
     * Check out the source in ../support/commands.js
     */
    cy.startSeeded()
  })

  it('Deletes an item in the list', function() {
    cy
      .get('ul.todo-list > li:first button.destroy')
      .then($btn => {
        $btn.show() // The button isn't visible, so we need to show it before clicking it
      })
      .click()
    cy.get('ul.todo-list > li').should('have.length', 4)
  })

  it('Deletes the correct item from the middle of the list', function() {
    cy.get('ul.todo-list > li:nth(1) button.destroy').click({ force: true })
    cy
      .get('ul.todo-list > li')
      .should('have.length', 4)
      .and('contain', 'One')
      .and('contain', 'Three')
      .and('contain', 'Four')
      .and('contain', 'Five')
      .and('not.contain', 'Two')
  })

  it('Toggles an item between incomplete and complete', function() {
    // Get the first list item and create an alias for it
    cy.get('ul.todo-list').find('li').first().as('firstItem')

    // Use the @firstItem alias for the remaining `get` calls
    cy.get('@firstItem').find('input.toggle').click()
    cy.get('@firstItem').should('have.class', 'completed')

    cy.get('@firstItem').find('input.toggle').click()
    cy.get('@firstItem').should('not.have.class', 'completed')
  })

  it('Switches to edit mode on double click', () => {
    cy.get('ul.todo-list > li:nth(1) label').dblclick()
    cy.get('ul.todo-list > li:nth(1)').should('have.class', 'editing')
  })

  it('Switches out of edit mode click outside', () => {
    cy.get('ul.todo-list > li:nth(1) label').dblclick()
    cy.get('ul.todo-list > li:nth(1)').should('have.class', 'editing')

    cy.get('div.todomvc-wrapper').click()
    cy.get('ul.todo-list > li:nth(1)').should('not.have.class', 'editing')
  })

  context('Once in edit mode', () => {
    beforeEach(() => {
      cy.get('ul.todo-list > li:nth(1) label').dblclick()
      // Set up an alias for use in the specs in this context
      cy.get('ul.todo-list li.editing input.edit').as('targetInput')
    })

    it('Retains the existing value when the input is toggled on', () => {
      const inputVal = 'With updates'
      cy.get('@targetInput')
        .type(inputVal, {delay: 50})
        .type('{enter}')
      cy.get('ul.todo-list li:nth(1) label').should('contain', inputVal)
    })

    it('Reflects a replaced input value', () => {
      const inputVal = 'Updated value'
      cy.get('@targetInput')
        .clear()
        .type(inputVal, {delay: 50})
        .type('{enter}')

      cy.get('ul.todo-list li:nth(1) label').should('have.text', inputVal)
      cy.get('ul.todo-list li:nth(1)').should('not.have.class', 'editing')
    })
  })
})
