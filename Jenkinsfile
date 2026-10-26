pipeline {
  agent { label 'lumina-ci' }
  options { skipDefaultCheckout(true); disableConcurrentBuilds(); timeout(time: 30, unit: 'MINUTES'); timestamps() }
  environment { VERCEL_CLI_VERSION = '62.7.0' }
  parameters {
    booleanParam(name: 'DEPLOY', defaultValue: false, description: 'Deploy protected main to Vercel production (Jenkins is the only production deployer)')
    // Normally set by the backend job after it verified the URL. Quick Tunnel URLs are TEMPORARY: redeploy whenever they change.
    string(name: 'PUBLIC_API_URL', defaultValue: '', description: 'Verified API URL from the backend deployment (https://<random>.trycloudflare.com/api in quick_tunnel mode); required for deploy')
    string(name: 'FRONTEND_URL', defaultValue: '', description: 'Terraform frontend_url output (https://<project>.vercel.app)')
    string(name: 'VERCEL_ORG_ID', defaultValue: '', description: 'Terraform vercel_team_id output (team or personal account ID)')
    string(name: 'VERCEL_PROJECT_ID', defaultValue: '', description: 'Terraform vercel_project_id output')
  }
  stages {
    stage('Checkout') { steps { checkout scm } }
    stage('Runtime') { steps { sh 'bash ci/check-runtime.sh' } }
    stage('Install') { steps { sh 'npm ci' } }
    stage('Tests') { steps { sh 'npm test -- --watch=false' } }
    stage('Production build') { steps { sh 'npm run build -- --configuration production' } }
    stage('Verify and package artifact') { steps {
      sh 'node ci/verify-artifact.mjs'
      sh 'mkdir -p artifacts && tar -czf artifacts/frontend.tar.gz -C dist/luminabeauty-app/browser .'
    } }
    stage('Deploy and verify Vercel') {
      when { allOf { branch 'main'; not { changeRequest() }; expression { params.DEPLOY } } }
      steps {
        withCredentials([string(credentialsId: 'lumina-vercel-token', variable: 'VERCEL_TOKEN')]) {
          sh 'bash ci/deploy.sh'
        }
      }
    }
  }
  post { success { archiveArtifacts artifacts: 'artifacts/frontend.tar.gz', fingerprint: true } }
}
