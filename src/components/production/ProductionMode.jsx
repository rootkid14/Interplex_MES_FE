import React from 'react';
import { useTranslation } from 'react-i18next';
import ActiveJobView from './ActiveJobView';


const ProductionMode = () => {
  const { t } = useTranslation();

  return (
    <div className="h-full flex flex-col">
       {/* Simple Header or Title if needed, otherwise direct View */}
       <div className="flex-1 min-h-0">
          <ActiveJobView />
       </div>
    </div>
  );
};

export default ProductionMode;