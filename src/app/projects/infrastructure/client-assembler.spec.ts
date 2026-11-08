import { Client } from '../domain/model/client.entity';
import { ClientAssembler } from './client-assembler';

describe('ClientAssembler', () => {
  const assembler = new ClientAssembler();

  it('turns null optional fields into empty strings', () => {
    const client = assembler.toEntityFromResource({
      id: 6,
      businessName: 'Nueva S.A.C.',
      ruc: '20999999991',
      contactName: null,
      phone: null,
      email: null,
    });
    expect([client.contactName, client.phone, client.email]).toEqual(['', '', '']);
  });

  it('sends empty optional fields as null', () => {
    const resource = assembler.toResourceFromEntity(
      new Client({ id: 0, businessName: 'Nueva S.A.C.', ruc: '20999999991', contactName: '', phone: '', email: 'a@b.pe' }),
    );
    expect(resource).toEqual({
      id: 0,
      businessName: 'Nueva S.A.C.',
      ruc: '20999999991',
      contactName: null,
      phone: null,
      email: 'a@b.pe',
    });
  });
});
