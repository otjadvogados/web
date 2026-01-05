import React from 'react';
import CustomerForm from '../../../sections/customers/CustomerForm';
import Permission from '../../../components/Permission';

// ==============================|| EDIT CLIENT PAGE ||============================== //

export default function EditClientPage() {
  return (
    <Permission resources={['customers.update']}>
      <CustomerForm />
    </Permission>
  );
}
