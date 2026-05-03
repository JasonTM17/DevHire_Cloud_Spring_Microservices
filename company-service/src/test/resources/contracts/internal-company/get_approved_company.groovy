import org.springframework.cloud.contract.spec.Contract

Contract.make {
    description 'company-service exposes approved company details for job-service'
    request {
        method GET()
        url '/internal/companies/20000000-0000-0000-0000-000000000001'
    }
    response {
        status OK()
        headers {
            contentType applicationJson()
        }
        body(
            id: '20000000-0000-0000-0000-000000000001',
            employerId: '00000000-0000-0000-0000-000000000002',
            status: 'APPROVED',
            approved: true
        )
    }
}
