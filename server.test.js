const request = require('supertest');
const app = require('./server');

describe('Contacts API', () => {
  let contactId;

  test('POST /api/contacts - should create a new contact', async () => {
    const newContact = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890'
    };

    const response = await request(app)
      .post('/api/contacts')
      .send(newContact)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe(newContact.name);
    
    contactId = response.body.id;
  });

  test('POST /api/contacts - should reject invalid email', async () => {
    const invalidContact = {
      name: 'Jane Doe',
      email: 'invalid-email',
      phone: '+1234567890'
    };

    const response = await request(app)
      .post('/api/contacts')
      .send(invalidContact)
      .expect(400);

    expect(response.body.error).toBe('Validation failed');
  });

  test('GET /api/contacts - should return list', async () => {
    const response = await request(app)
      .get('/api/contacts')
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('DELETE /api/contacts/:id - should delete', async () => {
    await request(app)
      .delete(`/api/contacts/${contactId}`)
      .expect(200);
  });
});