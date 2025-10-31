import SalesTicketWorkflow from '../../components/sales/sales-ticket-workflow';

export const metadata = {
  title: 'Sales Kiosk'
};

export default function KioskPage() {
  return <SalesTicketWorkflow mode="create" />;
}
