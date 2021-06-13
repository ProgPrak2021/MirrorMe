import { IonCol, IonContent, IonGrid, IonRow } from '@ionic/react';
import React from 'react';
import { useSelector } from 'react-redux';
import SummarizedCard from '../../components/SummarizedCard/SummarizedCard';
import { COMPANIES } from '../../globals';
import { selectData, selectHasData } from './dataSlice';
import EmptyView from './EmptyView';

const OverviewPage = () => {
  const hasData = useSelector(selectHasData);
  const relevantData = useSelector(selectData);

  return (
    <IonContent className="OverviewPage">
      {!hasData ? (
        <EmptyView />
      ) : (
        <IonGrid>
          <IonRow>
            <IonCol offset="3" size="6">
              {relevantData.map((companyObject) => {
                return (
                  <SummarizedCard
                    key={companyObject.company}
                    title={companyObject.company}
                    logo={companyObject.logo}
                  >
                    {
                      Object.values(COMPANIES).find(
                        (company) => company.name === companyObject.company
                      )?.summarized_component
                    }
                  </SummarizedCard>
                );
              })}
            </IonCol>
          </IonRow>
        </IonGrid>
      )}
    </IonContent>
  );
};

export default OverviewPage;
