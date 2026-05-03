import org.springframework.cloud.contract.spec.Contract

Contract.make {
    description 'job-service exposes published job details for application-service'
    request {
        method GET()
        url '/internal/jobs/30000000-0000-0000-0000-000000000001'
    }
    response {
        status OK()
        headers {
            contentType applicationJson()
        }
        body(
            id: '30000000-0000-0000-0000-000000000001',
            companyId: '20000000-0000-0000-0000-000000000001',
            employerId: '00000000-0000-0000-0000-000000000002',
            title: 'Senior Java Backend Engineer',
            status: 'PUBLISHED',
            published: true
        )
    }
}
