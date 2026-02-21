import type { SelectField } from 'payload'

export const siteField: SelectField = {
  name: 'site',
  type: 'select',
  required: true,
  options: [
    { label: 'GT Collective', value: 'gtcollective' },
    { label: 'Surfacelab', value: 'surfacelab' },
  ],
  admin: {
    position: 'sidebar',
  },
}
