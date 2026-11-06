import type { NavigatorScreenParams } from '@react-navigation/native';
import type { AssessmentV2Status } from './db';

export type TabParamList = {
  Dashboard: undefined;
  Records: { status?: AssessmentV2Status } | undefined;
  New: undefined;
  Submit: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList> | undefined;
  WizardModal: undefined;
  AssessmentReview: { id: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
