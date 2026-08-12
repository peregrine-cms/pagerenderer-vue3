package com.peregrine.pagerender.vue3.models;

import com.peregrine.nodetypes.models.AbstractComponent;
import com.peregrine.nodetypes.models.IComponent;

import javax.inject.Inject;
import java.util.List;

import org.apache.sling.api.resource.Resource;
import org.apache.sling.models.annotations.Default;
import org.apache.sling.models.annotations.DefaultInjectionStrategy;
import org.apache.sling.models.annotations.Exporter;
import org.apache.sling.models.annotations.Model;

import static com.peregrine.commons.util.PerConstants.JACKSON;
import static com.peregrine.commons.util.PerConstants.JSON;
import static com.peregrine.pagerender.vue3.models.PageRenderVue3Constants.PR_VUE3_COMPONENT_BASE_TYPE;

/**
 * Sling Model for the Vue 3 Base Component
 * Exports the 'text' property for use in the Vue component
 */
@Model(adaptables = Resource.class,
       resourceType = PR_VUE3_COMPONENT_BASE_TYPE,
       defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL,
       adapters = IComponent.class)
@Exporter(name = JACKSON, extensions = JSON)
public class BaseComponentModel extends AbstractComponent {

    @Inject
    @Default(values = "")
    private String text;

    @Inject
    @Default(values = "")
    private String extraclasses;

    @Inject
    private List<IComponent> experiences;

    public BaseComponentModel(Resource resource) {
        super(resource);
    }

    public String getText() {
        return text == null ? "" : text;
    }

    public String getExtraclasses() {
        return extraclasses;
    }

    public List<IComponent> getExperiences() {
        return experiences;
    }
}
