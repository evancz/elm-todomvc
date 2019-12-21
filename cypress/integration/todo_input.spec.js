describe('Creating todos', function () {
  beforeEach(function () {
    cy.visit('index.html')
  })

  it('should enter text into the input', function () {
    const expectedValue = 'testing'
    // Without the delay, characters are being missed & the assertion fails
    cy
      .get('.new-todo')
      .type(expectedValue, { delay: 50 })
      .should('have.value', expectedValue)
  })

  it('should add new items to the list', function () {
    const expectedValue = 'New Item'
    cy
      .get('.new-todo')
      .type(expectedValue)
      .type('{enter}')
      .should('have.value', '')

    cy.get('ul.todo-list>li').should('have.length', 1)
  })
})

