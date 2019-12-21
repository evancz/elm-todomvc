describe('Filtering todos', function() {
  beforeEach(function() {
    /**
     * `startSeeded` is a custom command that starts the app with seed data.
     * Check out the source in ../support/commands.js
     */
    cy.startSeeded()
  })

  it('Filters to show only active items', function() {
    cy.get('ul.filters').find('a[href="#/active"]').click()
    cy.get('ul.todo-list > li').should('have.length', 3)
  })

  it('Filters to show only completed items', function() {
    cy.get('ul.filters').find('a[href="#/completed"]').click()
    cy.get('ul.todo-list > li').should('have.length', 2)
  })

  it('Clears filter and shows all items', function() {
    cy.get('ul.filters').find('a[href="#/completed"]').click()
    cy.get('ul.todo-list > li').should('have.length', 2)

    cy.get('ul.filters').find('a[href="#/"]').click()
    cy.get('ul.todo-list > li').should('have.length', 5)
  })

  it('Clears completed items', function() {
    cy.get('button.clear-completed').click()
    cy.get('ul.todo-list > li').should('have.length', 3)
    cy.get('button.clear-completed').should('not.be.visible')
  })

  it('Shows the appropriate count of incomplete items', function() {
    const expectedLength = 3
    cy.get('ul.todo-list')
      .find('li')
      .not('.completed')
      .should('have.length', expectedLength)
    cy.get('span.todo-count').contains(expectedLength)
  })
})
