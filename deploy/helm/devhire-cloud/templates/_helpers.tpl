{{- define "devhire.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "devhire.labels" -}}
app.kubernetes.io/part-of: devhire-cloud
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
{{- end -}}

{{- define "devhire.selectorLabels" -}}
app.kubernetes.io/name: {{ .name }}
app.kubernetes.io/part-of: devhire-cloud
{{- end -}}

{{- define "devhire.configName" -}}
devhire-config
{{- end -}}

{{- define "devhire.secretName" -}}
{{- .Values.secrets.name | default "devhire-secrets" -}}
{{- end -}}

{{- define "devhire.image" -}}
{{- $root := index . "root" -}}
{{- $service := index . "service" -}}
{{- printf "%s/%s:%s" $root.Values.global.imageRegistry ($service.image | default (index . "name")) ($service.tag | default $root.Values.global.imageTag) -}}
{{- end -}}

{{- define "devhire.resources" -}}
{{- $root := index . "root" -}}
{{- $service := index . "service" -}}
{{- $profile := $service.resourceProfile | default "default" -}}
{{- toYaml (index $root.Values.resources $profile | default $root.Values.resources.default) -}}
{{- end -}}
