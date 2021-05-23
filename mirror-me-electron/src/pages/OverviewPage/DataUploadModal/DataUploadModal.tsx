import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonText,
  IonToolbar,
} from '@ionic/react';
import React, { useState } from 'react';
import { FunctionComponent } from 'react-router/node_modules/@types/react';
import DataDropzone from '../../../components/DataDropzone/DataDropzone';
import { COMPANIES } from '../../../globals';
import './DataUploadModal.scss';

interface Props {
  onDismiss: () => void;
}

const DataUploadModal: FunctionComponent<Props> = (props: Props) => {
  const [selectedCompany, setSelectedCompany] = useState<string>('Reddit');
  const { onDismiss } = props;

  const handleUpload = () => {
    console.log('files uploaded');
  };

  return (
    <div>
      <IonCard className="DataUploadModal__Card">
        <IonCardHeader className="DataUploadModal__Header">
          <IonHeader>
            <IonToolbar>
              <IonCardTitle>Data Upload</IonCardTitle>
              <IonButton
                className="DataUploadModal__Header-Button"
                fill="clear"
                slot="end"
                onClick={() => onDismiss()}
              >
                <IonIcon size="large" name="close" />
              </IonButton>
            </IonToolbar>
          </IonHeader>
        </IonCardHeader>
        <IonCardContent>
          <IonList>
            <IonItem lines="none" className="DataUploadModal__Ion-Item">
              <IonLabel>Selected company:</IonLabel>
              <IonSelect
                onIonChange={(element) =>
                  setSelectedCompany(element.detail.value)
                }
                value={selectedCompany}
              >
                {Object.values(COMPANIES).map((company) => {
                  return (
                    <IonSelectOption value={company.name} key={company.name}>
                      {company.name}
                    </IonSelectOption>
                  );
                })}
              </IonSelect>
            </IonItem>
            <IonText>Please drag and drop your data below:</IonText>
          </IonList>
          <DataDropzone selectedCompany={selectedCompany} />
          <IonList className="DataUploadModal__Item">
            <IonButton onClick={() => handleUpload()}>Upload</IonButton>
          </IonList>
        </IonCardContent>
      </IonCard>
    </div>
  );
};

export default DataUploadModal;
