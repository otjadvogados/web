// project imports
import devicesCenter from './sample-page';
import other from './other';
import pages from './pages';

// types
import { NavItemType } from 'types/menu';

// ==============================|| MENU ITEMS ||============================== //

const menuItems: { items: NavItemType[] } = {
  items: [devicesCenter, pages, other]
};

export default menuItems;
