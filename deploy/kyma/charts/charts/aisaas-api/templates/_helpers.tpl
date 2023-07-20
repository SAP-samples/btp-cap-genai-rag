{{/*
Expand the name of the chart.
*/}}
{{- define "aisaas-api.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "aisaas-api.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
*/}}
{{- define "aisaas-api.bindingName" -}}
{{- printf "%s-%s" (include "aisaas-api.fullname" .root ) .name }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "aisaas-api.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "aisaas-api.labels" -}}
helm.sh/revision: {{ .Release.Revision | quote }}
helm.sh/chart: {{ include "aisaas-api.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{ include "aisaas-api.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "aisaas-api.selectorLabels" -}}
app.kubernetes.io/name: {{ include "aisaas-api.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- if .Values.global}}
{{- if .Values.global.component }}
app.kubernetes.io/component: {{ .Values.global.component }}
{{- end }}
{{- if .Values.global.partOf }}
app.kubernetes.io/partOf: {{ .Values.global.partOf }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Define Host for the APIRule
*/}}
{{- define "aisaas-api.exposeHost" -}}
{{- if .Values.expose.host }}
{{- .Values.expose.host }}
{{- else }}
{{- $name := (include "aisaas-api.fullname" .) }}
{{- if hasPrefix $name .Release.Namespace }}
{{- .Release.Namespace }}
{{- else }}
{{- printf "%s-%s" $name .Release.Namespace | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Define the application uri which will be used for the VCAP_APPLICATION env variable
*/}}
{{- define "aisaas-api.applicationUri" -}}
{{- include "aisaas-api.fullname" . }}
{{- end }}

{{/*
Service Binding secret mounts
*/}}
{{- define "aisaas-api.serviceMounts" -}}
{{- range $name, $params := .Values.bindings }}
{{- if ( or ( not (hasKey $params "enabled")) $params.enabled ) }}
- mountPath: /bindings/{{ $name }}/
  name: "{{ $name }}"
  readOnly: true
{{- end }}
{{- end }}
{{- end }}

{{/*
Service Binding secret volumes
*/}}
{{- define "aisaas-api.serviceVolumes" -}}
{{- range $name, $params := .Values.bindings }}
{{- if ( or ( not (hasKey $params "enabled")) $params.enabled ) }}
{{- $secretName := (include "aisaas-api.bindingName" (dict "root" $ "name" $name)) }}
{{- if $params.fromSecret }}
{{- $secretName = $params.fromSecret}}
{{- else if $params.secretName }}
{{- $secretName = $params.secretName }}
{{- end }}
- name: {{ $name }}
  secret:
    secretName: {{ $secretName }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Name of the imagePullSecret
*/}}
{{- define "aisaas-api.imagePullSecretName" -}}
{{ $ips := (dict "local" .Values.imagePullSecret "global" .Values.global.imagePullSecret) }}
{{- if $ips.local.name }}
{{- $ips.local.name }}
{{- else if $ips.global.name }}
{{- $ips.global.name }}
{{- else if or $ips.local.dockerconfigjson $ips.global.dockerconfigjson }}
{{- include "aisaas-api.fullname" . }}
{{- end }}
{{- end }}

{{/*
Calculate the final image name
*/}}
{{- define "aisaas-api.imageName" -}}
{{- $tag := .Values.image.tag | default .Values.global.image.tag | default "latest" }}
{{- $registry := .Values.image.registry | default .Values.global.image.registry }}
{{- if $registry }}
{{- $registry | trimSuffix "/" }}/{{ .Values.image.repository }}:{{ $tag }}
{{- else }}
{{- .Values.image.repository }}:{{ $tag }}
{{- end }}
{{- end }}


{{/*
Create the name of a service instance.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as service insatnce name.
*/}}
{{- define "aisaas-api.serviceInstanceName" -}}
  {{- if .binding.serviceInstanceFullname }}
    {{- if gt (len .binding.serviceInstanceFullname) 63 }}
      {{- fail (printf "name exceeds 63 characters: '%s'" .binding.serviceInstanceFullname) }}
    {{- end }}
    {{- .binding.serviceInstanceFullname }}
  {{- else }}
    {{- $name := .binding.serviceInstanceName }}
    {{- if not (hasPrefix .release $name)}}
      {{- $name = printf "%s-%s" .release $name }}
    {{- end }}
    {{- if gt (len $name) 63 }}
      {{- fail (printf "name exceeds 63 characters: '%s'" $name) }}
    {{- end }}
    {{- $name }}
  {{- end }}
{{- end }}

{{- define "aisaas-api.processEnv" -}}
{{- $result := dict }}
{{- $variables := list }}
{{- range $k, $v := . }}
  {{- $variable := dict }}
  {{- if (kindIs "string" $k) }}
    {{- if eq "APPLICATION_NAME" $k }}
      {{- $_ := set $result "appName" true }}
    {{- end }}
    {{- if eq "APPLICATION_URI" $k }}
      {{- $_ := set $result "appURI" true }}
    {{- end }}
    {{- $_ := set $variable "name" $k -}}
    {{- if (kindIs "map" $v)}}
    {{- $_ := set $variable "valueFrom" $v}}
    {{- else }}
    {{- $_ := set $variable "value" ($v | toString) }}
    {{- end }}
  {{- else }}
    {{- if eq "APPLICATION_NAME" $v.name }}
      {{- $_ := set $result "appName" true }}
    {{- end }}
    {{- if eq "APPLICATION_URI" $v.name }}
      {{- $_ := set $result "appURI" true }}
    {{- end }}
    {{- $_ := set $variable "name" $v.name }}
    {{- if $v.value }}
      {{- $_ := set $variable "value" ($v.value | toString)}}
    {{- else }}
      {{- $_ := set $variable "valueFrom" (omit $v "name")}}
    {{- end }}
  {{- end }}
  {{- $variables = append $variables $variable}}
{{- end }}
{{- $_ := set $result "vars" $variables }}
{{- $result | mustToJson }}
{{- end }}