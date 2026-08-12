package com.peregrine.pagerender.vue3.models;

import static com.peregrine.commons.util.PerConstants.JACKSON;
import static com.peregrine.commons.util.PerConstants.JSON;
import static com.peregrine.pagerender.vue3.models.PageRenderVue3Constants.PR_VUE3_COMPONENT_CONTAINER_TYPE;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.peregrine.nodetypes.models.AbstractComponent;
import com.peregrine.nodetypes.models.IComponent;
import java.util.List;
import javax.inject.Inject;
import javax.inject.Named;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.models.annotations.Default;
import org.apache.sling.models.annotations.DefaultInjectionStrategy;
import org.apache.sling.models.annotations.Exporter;
import org.apache.sling.models.annotations.Model;

/**
 * Sling Model for Vue 3 Container components.
 * 
 * Containers can hold child components and render them recursively.
 * This is the base class for both generic containers and the page component.
 */
@Model(
    adaptables = Resource.class,
    resourceType = {PR_VUE3_COMPONENT_CONTAINER_TYPE},
    defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL,
    adapters = IComponent.class)
@Exporter(
    name = JACKSON,
    extensions = JSON)
public class Container extends AbstractComponent {

    @Inject
    @Named(".")
    private List<IComponent> children;

    @Inject
    @Default(values = "")
    private String extraclasses;

    public Container(Resource r) {
        super(r);
    }

    /**
     * Get the list of child components.
     * 
     * @return List of child components, or empty list if none
     */
    @Override
    @JsonIgnore(value = false)
    public List<IComponent> getChildren() {
        return children;
    }

    /**
     * Get extra CSS classes for styling.
     * 
     * @return Extra CSS classes string
     */
    public String getExtraclasses() {
        return extraclasses;
    }
}
