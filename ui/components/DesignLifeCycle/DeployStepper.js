import React, { useState } from 'react';
import { ValidateDesign } from './ValidateDesign';
import { DryRunDesign, getTotalCountOfDeploymentErrors } from './DryRun';
import {
  ModalBody,
  ModalFooter,
  useStepper,
  CustomizedStepper,
  ModalButtonPrimary,
  ModalButtonSecondary,
  Box,
  Typography,
} from '@sistent/sistent';
import { CheckBoxField, DEPLOYMENT_TYPE, Loading } from './common';
import DryRunIcon from '@/assets/icons/DryRunIcon';
import { DeploymentSelectorIcon } from '@/assets/icons/DeploymentSelectorIcon';
import CheckIcon from '@/assets/icons/CheckIcon';
import { DeploymentTargetContext, SelectTargetEnvironments } from './SelectDeploymentTarget';
import { FinalizeDeployment } from './finalizeDeployment';
import { selectAllSelectedK8sConnections } from '@/store/slices/globalEnvironmentContext';
import {
  useDryRunValidationResults,
  useIsValidatingDryRun,
} from 'machines/validator/designValidator';
import { useSelector } from 'react-redux';
import { styled } from '@sistent/sistent';
import { useTheme } from '@sistent/sistent';
import { EnvironmentIcon } from '@sistent/sistent';
import { useContext } from 'react';
import { NotificationCenterContext } from '../NotificationCenter';
import { useEffect } from 'react';
import { OPERATION_CENTER_EVENTS } from 'machines/operationsCenter';
import { capitalize } from 'lodash';
import FinishFlagIcon from '@/assets/icons/FinishFlagIcon';
import { DeploymentSummaryFormatter } from './DeploymentSummary';
import { SEVERITY } from '../NotificationCenter/constants';
import EnvironmentModal from '../General/Modals/EnvironmentModal';
import { openViewScopedToDesignInOperator } from '@/utils/utils';
import { useRouter } from 'next/router';
import ProviderStoreWrapper from '@/store/ProviderStoreWrapper';

export const ValidateContent = {
  btnText: 'Next',
  cancel: true,
};

const StepWrapper = styled(Box)({
  padding: 0,
  overflowY: 'auto',
});

const StepContent = styled('div', {
  // shouldForwardProp: (prop) => prop !== 'backgroundColor',
})(({ theme, backgroundColor }) => ({
  paddingInline: theme.spacing(4),
  paddingBlock: theme.spacing(2),
  backgroundColor: backgroundColor || theme.palette.background.default,
}));

export const FinishDeploymentStep = ({ perform_deployment, deployment_type, autoOpenView }) => {
  const { operationsCenterActorRef } = useContext(NotificationCenterContext);

  const [isDeploying, setIsDeploying] = useState(false);
  const [deployEvent, setDeployEvent] = useState();
  const [deployError, setDeployError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    try {
      setIsDeploying(true);
      perform_deployment();
    } catch (error) {
      setDeployError(error);
      setIsDeploying(false);
    }
  }, []);

  useEffect(() => {
    const subscription = operationsCenterActorRef.on(
      OPERATION_CENTER_EVENTS.EVENT_RECEIVED_FROM_SERVER,
      (event) => {
        const serverEvent = event.data.event;
        if (serverEvent.action === deployment_type) {
          setIsDeploying(false);
          setDeployEvent(serverEvent);

          if (autoOpenView && serverEvent.severity == SEVERITY.SUCCESS) {
            openViewScopedToDesignInOperator(
              serverEvent?.metadata?.design_name,
              serverEvent?.metadata?.design_id,
              router,
            );
          }
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const progressMessage = `${capitalize(deployment_type)}ing  design`;

  if (isDeploying) {
    return <Loading message={progressMessage} />;
  }

  if (deployError) {
    return (
      <Typography variant="h5" color="error">
        Error deploying design: {JSON.stringify(deployError)}
      </Typography>
    );
  }

  if (!deployEvent) {
    return null;
  }

  return <DeploymentSummaryFormatter event={deployEvent} />;
};

const SelectTargetStep = () => {
  const { organization } = useSelector((state) => state.ui);
  const { connectionMetadataState } = useSelector((state) => state.ui);
  const { controllerState: meshsyncControllerState } = useSelector((state) => state.ui);

  const [isEnvrionmentModalOpen, setIsEnvrionmentModalOpen] = useState(false);
  return (
    <DeploymentTargetContext.Provider
      value={{ connectionMetadataState, meshsyncControllerState, organization }}
    >
      <SelectTargetEnvironments setIsEnvrionmentModalOpen={setIsEnvrionmentModalOpen} />
      <EnvironmentModal
        isOpenModal={isEnvrionmentModalOpen}
        setIsOpenModal={setIsEnvrionmentModalOpen}
      />
    </DeploymentTargetContext.Provider>
  );
};

const DryRunStep = ({
  handleClose,
  bypassDryRun,
  setBypassDryRun,
  dryRunErrors,
  deployment_type,
  selectedK8sContexts,
  design,
  validationMachine,
  includeDependencies,
  setIncludeDependencies,
}) => {
  const bypassValidation = bypassDryRun || false;
  const toggleBypassValidation = () => setBypassDryRun(!bypassDryRun);
  const toggleIncludeDependencies = () => setIncludeDependencies(!includeDependencies);

  return (
    <Box>
      <DryRunDesign
        handleClose={handleClose}
        selectedK8sContexts={selectedK8sContexts}
        includeDependencies={includeDependencies}
        design={design}
        validationMachine={validationMachine}
        deployment_type={deployment_type}
      />

      {getTotalCountOfDeploymentErrors(dryRunErrors) > 0 && (
        <CheckBoxField
          label="Bypass errors and initiate deployment"
          checked={bypassValidation}
          onChange={toggleBypassValidation}
        />
      )}

      <CheckBoxField
        label="Include Dependencies"
        checked={includeDependencies}
        helpText="Deploys Custom Resource Definitions (CRDs) and operators based on the source from which a particular component was registered, [learn more](https://docs.meshery.io/guides/infrastructure-management/overview#auto-deployment-of-crds-and-operators) about auto deployment of dependencies"
        onChange={toggleIncludeDependencies}
      />
    </Box>
  );
};

// Component to handle the deployment process ie. deploy, undeploy and update ( as all have similar steps)
export const UpdateDeploymentStepper = ({
  handleClose,
  deployment_type,
  handlePerformDeployment,
  design,
  validationMachine,
}) => {
  const [includeDependencies, setIncludeDependencies] = useState(false);
  const [bypassDryRun, setBypassDryRun] = useState(false);
  const [openInOperator, setOpenInOperator] = useState(false);

  const dryRunErrors = useDryRunValidationResults(validationMachine);
  const totalDryRunErrors = getTotalCountOfDeploymentErrors(dryRunErrors);
  const isDryRunning = useIsValidatingDryRun(validationMachine);
  const theme = useTheme();

  const selectedK8sConnections = useSelector(selectAllSelectedK8sConnections);

  const selectedDeployableK8scontextIds = selectedK8sConnections.map(
    (k8sConnection) => k8sConnection.metadata.id,
  );

  const FinalizeBackgroundColor = theme.palette?.background?.blur.light;
  const actionFunction = () => {
    handlePerformDeployment({
      design,
      selectedK8sContexts: selectedDeployableK8scontextIds,
    });
  };
  const deployStepper = useStepper({
    steps: [
      {
        component: (
          <StepContent>
            <ValidateDesign
              handleClose={handleClose}
              validationMachine={validationMachine}
              design={design}
            />
          </StepContent>
        ),
        icon: CheckIcon,
        helpText: `Validate the design before deploying, [learn more](https://docs.meshery.io/guides/infrastructure-management/overview) about the validation process`,
        label: 'Validate Design',
      },
      {
        component: (
          <StepContent>
            {' '}
            <SelectTargetStep handleClose={handleClose} />{' '}
          </StepContent>
        ),
        helpText:
          'Select the environment  and cluster to deploy the design, [learn more](https://docs.meshery.io/guides/infrastructure-management/overview)  about the environment selection',
        icon: EnvironmentIcon,
        label: 'Identify Environments',
      },
      {
        component: (
          <StepContent>
            <DryRunStep
              selectedK8sContexts={selectedDeployableK8scontextIds}
              design={design}
              validationMachine={validationMachine}
              handleClose={handleClose}
              deployment_type={deployment_type}
              includeDependencies={includeDependencies}
              setIncludeDependencies={setIncludeDependencies}
              setBypassDryRun={setBypassDryRun}
              dryRunErrors={dryRunErrors}
            />
          </StepContent>
        ),
        helpText:
          'Dry Run is a simulation of the deployment process, it helps to identify potential errors before the actual deployment ,\
          [learn more](https://docs.meshery.io/guides/infrastructure-management/overview ) about Dry Run.',
        label: 'Dry Run',
        icon: DryRunIcon,
      },
      {
        component: (
          <StepContent backgroundColor={FinalizeBackgroundColor}>
            <FinalizeDeployment
              design={design}
              deployment_type={deployment_type}
              openInVisualizer={openInOperator}
              setOpenInVisualizer={setOpenInOperator}
            />
          </StepContent>
        ),
        helpText:
          'Finalize the deployment process and overview the configuration for your deployment.\
          [Learn more](https://docs.meshery.io/guides/infrastructure-management/overview) about the deployment process.',
        label: 'Finalize Deployment',
        icon: DeploymentSelectorIcon,
      },
      {
        component: (
          <StepContent>
            <FinishDeploymentStep
              design={design}
              deployment_type={deployment_type}
              perform_deployment={actionFunction}
              autoOpenView={openInOperator}
            />{' '}
          </StepContent>
        ),
        helpText:
          'Receipt of your deployment,includes the deployment status of components within the design and error logs. [Learn more](https://docs.meshery.io/guides/infrastructure-management/overview) about the deployment process.',
        label: 'Finsh',
        icon: FinishFlagIcon,
      },
    ],
  });

  const transitionConfig = {
    0: {
      canGoNext: () => true,
      nextButtonText: 'Next',
      nextAction: () => deployStepper.handleNext(),
    },
    1: {
      canGoNext: () => selectedK8sConnections.length > 0,
      nextButtonText: 'Next',
      nextAction: () => deployStepper.handleNext(),
    },
    2: {
      canGoNext: () => !isDryRunning & (totalDryRunErrors == 0 || bypassDryRun),
      nextButtonText: 'Next',
      nextAction: () => deployStepper.handleNext(),
    },
    3: {
      canGoNext: () => true,
      nextButtonText: capitalize(deployment_type),
      nextAction: () => {
        deployStepper.handleNext();
      },
    },
    4: {
      canGoNext: () => true,
      nextButtonText: 'Finish',
      nextAction: handleClose,
    },
  };

  const canGoNext = transitionConfig[deployStepper.activeStep].canGoNext();
  const nextButtonText = transitionConfig[deployStepper.activeStep].nextButtonText;

  return (
    <>
      <ModalBody style={{ padding: 0 }}>
        <Box>
          <CustomizedStepper {...deployStepper} ContentWrapper={StepWrapper}>
            {deployStepper.activeStepComponent}
          </CustomizedStepper>
        </Box>
      </ModalBody>
      <ModalFooter
        variant="filled"
        helpText={
          deployStepper.steps[deployStepper.activeStep]?.helpText ||
          `${deployment_type} the current design`
        }
      >
        <Box style={{ width: '100%', display: 'flex', gap: '1rem', justifyContent: 'end' }}>
          <ModalButtonSecondary onClick={deployStepper.goBack} disabled={!deployStepper.canGoBack}>
            Back
          </ModalButtonSecondary>
          <ModalButtonPrimary
            disabled={!canGoNext}
            onClick={transitionConfig[deployStepper.activeStep].nextAction}
          >
            {nextButtonText}
          </ModalButtonPrimary>
        </Box>
      </ModalFooter>
    </>
  );
};

export const DeployStepper = ({ handleClose, design, validationMachine, handleDeploy }) => (
  <ProviderStoreWrapper>
    <UpdateDeploymentStepper
      handleClose={handleClose}
      design={design}
      handlePerformDeployment={handleDeploy}
      validationMachine={validationMachine}
      deployment_type={DEPLOYMENT_TYPE.DEPLOY}
    />
  </ProviderStoreWrapper>
);

export const UnDeployStepper = ({ handleClose, design, handleUndeploy, validationMachine }) => (
  <ProviderStoreWrapper>
    <UpdateDeploymentStepper
      handleClose={handleClose}
      design={design}
      handlePerformDeployment={handleUndeploy}
      validationMachine={validationMachine}
      deployment_type={DEPLOYMENT_TYPE.UNDEPLOY}
    />
  </ProviderStoreWrapper>
);
