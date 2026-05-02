package com.devhire.job.search;

import com.devhire.job.entity.Job;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnMissingBean(JobSearchIndex.class)
public class NoopJobSearchIndex implements JobSearchIndex {
    @Override
    public void sync(Job job) {
    }

    @Override
    public void remove(Job job) {
    }
}
