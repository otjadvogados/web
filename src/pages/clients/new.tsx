import React from 'react';
import CustomerForm from '../../sections/customers/CustomerForm';
import Permission from '../../components/Permission';

// ==============================|| NEW CLIENT PAGE ||============================== //

export default function NewClientPage() {
  return (
    <Permission resources={['customers.create']}>
      <CustomerForm />
    </Permission>
  );
}
